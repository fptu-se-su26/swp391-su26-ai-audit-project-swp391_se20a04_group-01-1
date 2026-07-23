const axios = require("axios");
const cheerio = require("cheerio");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const HTTP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// Danh sách category chuẩn đang được seed trong bảng EventCategories.
// Nếu DB có thêm category khác, hãy cập nhật danh sách này để AI phân loại đúng.
const ALLOWED_CATEGORIES = ["Lễ hội lớn", "Hòa nhạc", "Thể thao", "Văn hóa"];

function stripCodeFence(rawText) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
}

/**
 * Chuẩn hóa chuỗi để dùng khi so sánh và loại trùng sự kiện.
 */
function normalizeForComparison(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lấy ngày YYYY-MM-DD từ giá trị thời gian.
 */
function getDatePart(value) {
  if (!value) return "";

  const matched = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return matched ? matched[0] : "";
}

/**
 * Tạo khóa dùng để loại sự kiện trùng nhau.
 */
function createEventKey(event) {
  const normalizedTitle = normalizeForComparison(event?.title);
  const datePart = getDatePart(event?.start_time);

  return `${normalizedTitle}|${datePart}`;
}

/**
 * Chia nội dung HTML đã đơn giản hóa thành nhiều phần nhỏ
 * để tránh gửi một prompt quá dài cho AI.
 */
function splitContentIntoChunks(content, maxLength = 12000) {
  const normalizedContent = String(content ?? "").trim();

  if (!normalizedContent) {
    return [];
  }

  const lines = normalizedContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = "";

  for (const line of lines) {
    const nextContent = currentChunk ? `${currentChunk}\n${line}` : line;

    if (nextContent.length > maxLength && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk = nextContent;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Đọc JSON từ phản hồi Gemini.
 * Hỗ trợ cả JSON array trực tiếp và object dạng { events: [...] }.
 */
function parseEventsFromAIResponse(rawResponseText) {
  const cleanedText = stripCodeFence(String(rawResponseText ?? ""));

  if (!cleanedText) {
    return [];
  }

  const parsed = JSON.parse(cleanedText);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.events)) {
    return parsed.events;
  }

  return [];
}

/**
 * Chuẩn hóa category để đảm bảo phù hợp với dữ liệu đã seed trong DB.
 */
function normalizeCategoryName(categoryName) {
  const matchedCategory = ALLOWED_CATEGORIES.find(
    (category) =>
      normalizeForComparison(category) === normalizeForComparison(categoryName),
  );

  return matchedCategory || "Văn hóa";
}

/**
 * Chuẩn hóa giá trị boolean do AI trả về.
 */
function normalizeFreeStatus(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true") return true;
    if (normalizedValue === "false") return false;
  }

  return true;
}

/**
 * Kiểm tra một giá trị thời gian có hợp lệ hay không.
 */
function isValidDateTime(value) {
  if (!value) return false;

  const parsedDate = new Date(String(value).replace(" ", "T"));
  return !Number.isNaN(parsedDate.getTime());
}

/**
 * Chuẩn hóa dữ liệu một sự kiện trước khi chuyển sang tầng đồng bộ DB.
 */
function normalizeExtractedEvent(event, options = {}) {
  const { catalogUrl = "", defaultBannerUrl = "" } = options;

  const title = String(event?.title ?? "")
    .replace(/\s+/g, " ")
    .trim();

  const startTime = String(event?.start_time ?? "").trim();
  let endTime = String(event?.end_time ?? "").trim();

  if (!title || !isValidDateTime(startTime)) {
    return null;
  }

  if (!isValidDateTime(endTime)) {
    const startDate = getDatePart(startTime);

    endTime = startDate ? `${startDate} 22:00:00` : startTime;
  }

  const isFree = normalizeFreeStatus(event?.is_free);

  const rawTicketPrice = Number(event?.ticket_price);
  const ticketPrice =
    isFree || Number.isNaN(rawTicketPrice) ? 0 : Math.max(0, rawTicketPrice);

  const aiBannerUrl = String(event?.banner_url ?? "").trim();
  const bannerUrl = aiBannerUrl.startsWith("http")
    ? aiBannerUrl
    : defaultBannerUrl;

  return {
    title,
    category_name: normalizeCategoryName(event?.category_name),
    location_name: String(event?.location_name ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    address: String(event?.address ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    district: String(event?.district ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    start_time: startTime,
    end_time: endTime,
    is_free: isFree,
    ticket_price: ticketPrice,
    description: String(event?.description ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    banner_url: bannerUrl,
    gallery_urls: bannerUrl ? [bannerUrl] : [],
    source_url: catalogUrl,
  };
}

/**
 * Gộp danh sách sự kiện và loại trùng theo title + ngày bắt đầu.
 */
function mergeUniqueEvents(targetEvents, incomingEvents) {
  const eventMap = new Map();

  for (const event of [...targetEvents, ...incomingEvents]) {
    const key = createEventKey(event);

    if (!key || key === "|") {
      continue;
    }

    const existingEvent = eventMap.get(key);

    if (!existingEvent) {
      eventMap.set(key, event);
      continue;
    }

    // Nếu bị trùng, ưu tiên bản có nhiều thông tin hơn.
    const mergedEvent = {
      ...existingEvent,
      ...Object.fromEntries(
        Object.entries(event).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        ),
      ),
    };

    eventMap.set(key, mergedEvent);
  }

  return Array.from(eventMap.values());
}

// ==========================================
// 1. Hàm cào danh sách link và sắp xếp sự kiện gần nhất lên đầu
//
// LƯU Ý (best-effort): Trang category của site (vd trang này) có vẻ được render
// phía client (Next.js) — phần danh sách bài viết thật sự có thể không xuất hiện
// trong HTML tĩnh trả về từ server, chỉ có 1 widget "Explore" gợi ý vài bài không
// liên quan. Vì vậy hàm này có thể trả về rất ít hoặc không có link nào; đây là
// lớp thu thập bổ sung (best-effort), KHÔNG phải nguồn phụ thuộc chính.
// Nguồn đáng tin cậy nhất vẫn là `crawlYearlyEventCatalog()` (trang danh mục tổng
// hợp cả năm, render tĩnh đầy đủ) + route cào-1-URL thủ công của Admin cho các bài
// sự kiện chi tiết mới phát sinh (các bài chi tiết vẫn render server-side đầy đủ).
// ==========================================
async function fetchEventLinksFromListing() {
  try {
    const listingUrl =
      "https://danangfantasticity.com/category/festivals-events?id=13106";
    const { data } = await axios.get(listingUrl, { headers: HTTP_HEADERS });
    const $ = cheerio.load(data);
    const rawLinks = [];

    const keywords = [
      "su-kien",
      "event",
      "le-hoi",
      "festival",
      "hoi",
      "van-hoa",
      "du-lich",
      "di-san",
      "phao-hoa",
      "diff",
      "anh-sang",
      "khinh-khi-cau",
      "den-long",
      "ao-dai",
      "sac-mau",
      "chao-nam-moi",
      "giang-sinh",
      "noel",
      "tet-viet",
      "tet-trung-thu",
      "tan-huong",
      "giai-chay",
      "marathon",
      "dua-thuyen",
      "bong-da",
      "pickleball",
      "ironman",
      "aquaman",
      "the-thao",
      "golf",
      "world-cup",
      "chuyen-dong",
      "trien-lam",
      "nghe-thuat",
      "am-nhac",
      "concert",
      "lien-hoan-phim",
      "fashion",
      "trinh-dien",
      "my-thuat",
      "nhiep-anh",
      "dieu-khac",
      "am-vang",
      "ban-nhac",
      "tuong",
      "dan-ca",
      "cho-phien",
      "am-thuc",
      "food-tour",
      "lang-nghe",
      "thu-cong",
      "dac-san",
      "banh-dan-gian",
      "sam-ngọc-linh",
      "duoc-lieu",
      "le-via",
      "le-cung",
      "cau-ngu",
      "ky-yen",
      "gio-to",
      "xuong-dong",
      "quan-the-am",
      "dinh-lang",
      "lang-ong",
      "cau-bong",
      "ta-on-rung",
      // Các tiền tố đường dẫn tiếng Anh hiện tại của site cho bài viết sự kiện/lễ hội
      "/festivals-events/",
      "/le-hoi-su-kien/",
      "/discovery/",
      "/news/",
      "new-year",
      "carnival",
      "calendar",
    ];

    $("a").each((_, element) => {
      const link = $(element).attr("href");
      if (
        link &&
        link.startsWith("http") &&
        link.includes("danangfantasticity.com") &&
        !rawLinks.includes(link)
      ) {
        const lowerLink = link.toLowerCase();
        const isMatched = keywords.some((keyword) =>
          lowerLink.includes(keyword.toLowerCase()),
        );

        if (
          isMatched &&
          link !== listingUrl &&
          !link.includes("/page/") &&
          !link.includes("/category/") &&
          !link.includes("/tag/")
        ) {
          rawLinks.push(link);
        }
      }
    });

    console.log(
      `[Crawler] Đã quét và bắt được ${rawLinks.length} đường dẫn sự kiện.`,
    );
    return rawLinks;
  } catch (error) {
    console.error("Lỗi khi cào danh sách link sự kiện:", error.message);
    return [];
  }
}

// ==========================================
// 2. Hàm cào chi tiết 1 URL bài viết sự kiện, bóc tách AI (lọc hiện tại & tương lai)
// ==========================================
async function scrapeAndExtractEventDetail(targetUrl) {
  try {
    const { data } = await axios.get(targetUrl, { headers: HTTP_HEADERS });
    const $ = cheerio.load(data);

    // const pageTitle = $("title").text();

    // const pageContent = $(".entry-content").text().replace(/\s+/g, " ").trim();

    let bannerUrl = $('meta[property="og:image"]').attr("content") || "";
    if (!bannerUrl) {
      bannerUrl =
        $(".post-thumbnail img, .entry-content img, img").first().attr("src") ||
        "";
    }

    // Thu thập luôn thư viện ảnh phụ trong nội dung bài viết (tối đa 8 ảnh, loại trùng)
    const galleryUrls = [];
    $(".entry-content img, article img, .post-content img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src && src.startsWith("http") && !galleryUrls.includes(src)) {
        galleryUrls.push(src);
      }
    });

    $("script, style, nav, footer, header").remove();
    const pageText = $("body").text().replace(/\s+/g, " ").trim();

    const prompt = `
      Dưới đây là nội dung trang web sự kiện du lịch Đà Nẵng tại URL "${targetUrl}":
      "${pageText.substring(0, 8000)}"
      
      Hãy đọc nội dung trên và trích xuất thành một đối tượng JSON chuẩn duy nhất (không bọc markdown code blocks) với các trường sau:
      {
        "title": "Tên sự kiện chính xác",
        "category_name": "Chọn đúng 1 trong các giá trị sau: ${ALLOWED_CATEGORIES.join(", ")}",
        "location_name": "Tên địa điểm tổ chức cụ thể",
        "address": "Tên số nhà, tên đường và phường",
        "district": "Tên quận chính xác (Sơn Trà, Hải Châu, Ngũ Hành Sơn, Thanh Khê, Liên Chiểu, Cẩm Lệ, Hòa Vang)",
        "start_time": "Thời gian bắt đầu chuẩn định dạng YYYY-MM-DD HH:mm:ss (lấy năm 2026)",
        "end_time": "Thời gian kết thúc chuẩn định dạng YYYY-MM-DD HH:mm:ss",
        "is_free": boolean,
        "ticket_price": number (0 nếu miễn phí),
        "description": "Đoạn văn mô tả tóm tắt sự kiện ngắn gọn, hấp dẫn bằng tiếng Việt"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const rawText = stripCodeFence(response.text);
    const aiResultJson = JSON.parse(rawText);

    // Lọc bỏ các sự kiện đã diễn ra trong quá khứ (chỉ giữ lại từ thời điểm hiện tại trở về tương lai)
    const eventDate = new Date(aiResultJson.start_time);
    const currentDate = new Date();

    if (eventDate < currentDate) {
      return null;
    }

    return {
      ...aiResultJson,
      banner_url: bannerUrl,
      gallery_urls: galleryUrls.slice(0, 8),
      source_url: targetUrl,
    };
  } catch (error) {
    console.error(`Lỗi cào và bóc tách AI từ ${targetUrl}:`, error.message);
    return null;
  }
}

// ==========================================
// 3. Cào toàn bộ danh mục sự kiện năm.
//
// Kiến trúc:
// - HTML là nguồn dữ liệu chính.
// - Giữ lại tiêu đề, đoạn văn, danh sách và ảnh theo thứ tự xuất hiện.
// - Chia nội dung thành nhiều phần để AI không bỏ sót vì prompt quá dài.
// - Poster chỉ được dùng làm fallback khi HTML không trích xuất được sự kiện.
// ==========================================
async function crawlYearlyEventCatalog(
  catalogUrl = "https://danangfantasticity.com/en/le-hoi-su-kien/danh-muc-su-kien-va-le-hoi-da-nang-nam-2026",
) {
  try {
    console.log(`[Catalog Crawler] Đang tải trang danh mục: ${catalogUrl}`);

    const { data } = await axios.get(catalogUrl, {
      headers: HTTP_HEADERS,
      timeout: 30000,
    });

    const $ = cheerio.load(data);

    // ------------------------------------------
    // 3.1. Xác định vùng nội dung chính
    // ------------------------------------------
    let contentRoot = $(".entry-content").first();

    if (!contentRoot.length) {
      contentRoot = $("article").first();
    }

    if (!contentRoot.length) {
      contentRoot = $("main").first();
    }

    if (!contentRoot.length) {
      console.log(
        "[Catalog Crawler] Không tìm thấy vùng nội dung chính của bài viết.",
      );
      return [];
    }

    // ------------------------------------------
    // 3.2. Thu thập toàn bộ ảnh trong bài viết
    // ------------------------------------------
    const contentImageUrls = [];

    contentRoot.find("img").each((_, imageElement) => {
      const image = $(imageElement);

      const imageUrl =
        image.attr("data-src") ||
        image.attr("data-lazy-src") ||
        image.attr("src") ||
        "";

      const normalizedImageUrl = imageUrl.trim();

      if (
        normalizedImageUrl.startsWith("http") &&
        !contentImageUrls.includes(normalizedImageUrl)
      ) {
        contentImageUrls.push(normalizedImageUrl);
      }
    });

    const posterUrl = contentImageUrls[0] || "";

    console.log(
      `[Catalog Crawler] Tìm thấy ${contentImageUrls.length} ảnh trong nội dung.`,
    );

    if (posterUrl) {
      console.log(`[Catalog Crawler] Ảnh mặc định: ${posterUrl}`);
    }

    // ------------------------------------------
    // 3.3. Tạo phiên bản HTML đơn giản hóa
    //
    // Không chỉ dùng .text() vì .text() sẽ làm mất:
    // - cấu trúc tiêu đề;
    // - vị trí ảnh;
    // - alt của ảnh;
    // - mối liên hệ giữa ảnh và sự kiện.
    // ------------------------------------------
    const contentLines = [];
    const seenLines = new Set();

    contentRoot
      .find("h1, h2, h3, h4, h5, h6, p, li, figcaption, img")
      .each((_, element) => {
        const node = $(element);
        const tagName = element.tagName?.toLowerCase();

        let line = "";

        if (tagName === "img") {
          const imageUrl =
            node.attr("data-src") ||
            node.attr("data-lazy-src") ||
            node.attr("src") ||
            "";

          const altText = node.attr("alt") || "";

          if (imageUrl.startsWith("http")) {
            line = `[IMAGE] alt="${altText.trim()}" url="${imageUrl.trim()}"`;
          }
        } else {
          const text = node.text().replace(/\s+/g, " ").trim();

          if (!text) {
            return;
          }

          if (/^h[1-6]$/.test(tagName)) {
            line = `[HEADING] ${text}`;
          } else if (tagName === "li") {
            line = `[LIST ITEM] ${text}`;
          } else if (tagName === "figcaption") {
            line = `[IMAGE CAPTION] ${text}`;
          } else {
            line = `[TEXT] ${text}`;
          }
        }

        if (line && !seenLines.has(line)) {
          seenLines.add(line);
          contentLines.push(line);
        }
      });

    const structuredContent = contentLines.join("\n");

    console.log(
      `[Catalog Crawler] Đã trích xuất ${structuredContent.length} ký tự HTML có cấu trúc.`,
    );

    if (!structuredContent) {
      console.log(
        "[Catalog Crawler] Nội dung HTML rỗng, sẽ thử fallback bằng poster.",
      );
    }

    // ------------------------------------------
    // 3.4. Chia nội dung thành nhiều phần
    // ------------------------------------------
    const contentChunks = splitContentIntoChunks(structuredContent, 12000);

    console.log(
      `[Catalog Crawler] Nội dung được chia thành ${contentChunks.length} phần để AI xử lý.`,
    );

    let extractedEvents = [];

    // ------------------------------------------
    // 3.5. AI đọc HTML — nguồn chính
    // ------------------------------------------
    for (let index = 0; index < contentChunks.length; index += 1) {
      const currentChunk = contentChunks[index];

      console.log(
        `[Catalog Crawler] Đang xử lý phần HTML ${index + 1}/${contentChunks.length}...`,
      );

      const htmlPrompt = `
Bạn là hệ thống trích xuất dữ liệu sự kiện du lịch Đà Nẵng.

Dưới đây là PHẦN ${index + 1}/${contentChunks.length} của một bài viết
"Danh mục sự kiện và lễ hội Đà Nẵng năm 2026".

Nội dung có các nhãn:

- [HEADING]&#58; tiêu đề hoặc tên sự kiện.
- [TEXT]&#58; đoạn mô tả, thời gian, địa điểm hoặc thông tin liên quan.
- [LIST ITEM]&#58; nội dung trong danh sách.
- [IMAGE]&#58; ảnh xuất hiện tại vị trí tương ứng trong bài viết.
- [IMAGE CAPTION]&#58; chú thích ảnh.

NHIỆM VỤ:

1. Trích xuất TẤT CẢ sự kiện thực sự xuất hiện trong phần nội dung này.
2. Không tự tạo thêm sự kiện không có trong nguồn.
3. Không coi tiêu đề chung của bài viết là một sự kiện.
4. Không coi tên nhà tài trợ, đơn vị tổ chức hoặc địa điểm là sự kiện riêng.
5. Nếu một sự kiện có nhiều đoạn mô tả liên tiếp, hãy gộp chúng thành một sự kiện.
6. Ưu tiên dữ liệu được ghi rõ trong HTML.
7. Không suy đoán địa chỉ hoặc quận khi nguồn không cung cấp đủ thông tin.
8. Chỉ sử dụng năm 2026 vì đây là danh mục sự kiện năm 2026.

QUY TẮC THỜI GIAN:

- Định dạng: YYYY-MM-DD HH:mm:ss.
- Nếu nguồn có ngày nhưng không có giờ:
  - start_time dùng 08:00:00;
  - end_time dùng 22:00:00.
- Nếu sự kiện diễn ra một ngày:
  - start_time và end_time cùng ngày.
- Nếu nguồn ghi một khoảng ngày:
  - dùng ngày đầu cho start_time;
  - dùng ngày cuối cho end_time.
- Nếu nguồn chỉ ghi tháng:
  - start_time là ngày đầu tháng lúc 08:00:00;
  - end_time là ngày cuối tháng lúc 22:00:00.
- Nếu hoàn toàn không xác định được ngày hoặc tháng:
  - không đưa mục đó vào kết quả.
- Không được tạo ngày ngẫu nhiên.

QUY TẮC GIÁ VÉ:

- Chỉ đặt is_free=true khi nguồn ghi miễn phí hoặc không có thông tin giá vé.
- Khi is_free=true, ticket_price phải bằng 0.
- Nếu nguồn ghi giá vé cụ thể, đặt is_free=false và ticket_price là số.
- Không tự tạo giá vé.

QUY TẮC ẢNH:

- Nếu dòng [IMAGE] nằm trong phần nội dung của sự kiện,
  dùng URL đó làm banner_url.
- Không tự tạo URL ảnh.
- Nếu không xác định được ảnh tương ứng, để banner_url là chuỗi rỗng.

Mỗi sự kiện phải có đúng cấu trúc:

{
  "title": "Tên sự kiện chính xác",
  "category_name": "Chọn đúng một trong: ${ALLOWED_CATEGORIES.join(", ")}",
  "location_name": "Tên địa điểm nếu nguồn có, nếu không để chuỗi rỗng",
  "address": "Địa chỉ nếu nguồn có, nếu không để chuỗi rỗng",
  "district": "Quận/huyện nếu nguồn có, nếu không để chuỗi rỗng",
  "start_time": "YYYY-MM-DD HH:mm:ss",
  "end_time": "YYYY-MM-DD HH:mm:ss",
  "is_free": true hoặc false,
  "ticket_price": số,
  "description": "Tóm tắt trung thực từ nội dung nguồn, không quảng cáo quá mức",
  "banner_url": "URL ảnh trong HTML hoặc chuỗi rỗng"
}

Chỉ trả lời bằng một JSON ARRAY.
Không dùng markdown.
Không thêm lời giải thích.

NỘI DUNG HTML:

${currentChunk}
`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: htmlPrompt,
          config: {
            temperature: 0,
          },
        });

        const chunkEvents = parseEventsFromAIResponse(response.text);

        const normalizedChunkEvents = chunkEvents
          .map((event) =>
            normalizeExtractedEvent(event, {
              catalogUrl,
              defaultBannerUrl: posterUrl,
            }),
          )
          .filter(Boolean);

        extractedEvents = mergeUniqueEvents(
          extractedEvents,
          normalizedChunkEvents,
        );

        console.log(
          `[Catalog Crawler] Phần ${index + 1} trích xuất được ${normalizedChunkEvents.length} sự kiện hợp lệ.`,
        );
      } catch (chunkError) {
        console.error(
          `[Catalog Crawler] Lỗi xử lý phần HTML ${index + 1}:`,
          chunkError.message,
        );
      }
    }

    // ------------------------------------------
    // 3.6. Poster fallback
    //
    // Chỉ gọi Vision khi HTML hoàn toàn không cho kết quả.
    // Việc này tránh:
    // - tốn API không cần thiết;
    // - tạo dữ liệu trùng;
    // - OCR ghi đè dữ liệu chính xác từ HTML.
    // ------------------------------------------
    if (extractedEvents.length === 0 && posterUrl) {
      console.log(
        "[Catalog Crawler] HTML không trích xuất được sự kiện. Chuyển sang fallback bằng poster...",
      );

      try {
        const imageResponse = await axios.get(posterUrl, {
          headers: HTTP_HEADERS,
          responseType: "arraybuffer",
          timeout: 30000,
        });

        const mimeType = imageResponse.headers["content-type"] || "image/jpeg";

        const base64Image = Buffer.from(imageResponse.data).toString("base64");

        const visionPrompt = `
Bạn đang đọc poster "Danh mục sự kiện và lễ hội Đà Nẵng năm 2026".

Hãy trích xuất tất cả sự kiện thực sự nhìn thấy trong ảnh.

Không tự tạo sự kiện.
Không tạo ngày ngẫu nhiên.
Nếu không xác định được ngày hoặc tháng thì bỏ mục đó.

Quy tắc thời gian:

- Không có giờ: bắt đầu 08:00:00, kết thúc 22:00:00.
- Chỉ có tháng: bắt đầu ngày đầu tháng, kết thúc ngày cuối tháng.
- Sự kiện một ngày: start_time và end_time cùng ngày.

Mỗi sự kiện có cấu trúc:

{
  "title": "Tên sự kiện",
  "category_name": "Chọn đúng một trong: ${ALLOWED_CATEGORIES.join(", ")}",
  "location_name": "",
  "address": "",
  "district": "",
  "start_time": "YYYY-MM-DD HH:mm:ss",
  "end_time": "YYYY-MM-DD HH:mm:ss",
  "is_free": true,
  "ticket_price": 0,
  "description": "Mô tả ngắn, trung thực theo nội dung nhìn thấy",
  "banner_url": "${posterUrl}"
}

Chỉ trả về một JSON ARRAY.
Không dùng markdown.
Không thêm chú thích.
`;

        const visionResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [
            {
              text: visionPrompt,
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
          config: {
            temperature: 0,
          },
        });

        const visionEvents = parseEventsFromAIResponse(visionResponse.text);

        extractedEvents = visionEvents
          .map((event) =>
            normalizeExtractedEvent(event, {
              catalogUrl,
              defaultBannerUrl: posterUrl,
            }),
          )
          .filter(Boolean);

        extractedEvents = mergeUniqueEvents([], extractedEvents);

        console.log(
          `[Catalog Crawler] Poster fallback trích xuất được ${extractedEvents.length} sự kiện.`,
        );
      } catch (visionError) {
        console.error(
          "[Catalog Crawler] Poster fallback thất bại:",
          visionError.message,
        );
      }
    }

    // ------------------------------------------
    // 3.7. Kết quả cuối
    // ------------------------------------------
    console.log(
      `[Catalog Crawler] Hoàn tất. Tổng cộng ${extractedEvents.length} sự kiện hợp lệ.`,
    );

    return extractedEvents;
  } catch (error) {
    console.error(
      "[Catalog Crawler] Lỗi khi cào danh mục sự kiện:",
      error.message,
    );

    if (error.response?.data) {
      console.error(error.response.data);
    }

    return [];
  }
}
module.exports = {
  fetchEventLinksFromListing,
  scrapeAndExtractEventDetail,

  // Alias để tương thích với route cào một URL thủ công của Admin.
  scrapeAndExtractEvents: scrapeAndExtractEventDetail,

  crawlYearlyEventCatalog,
};

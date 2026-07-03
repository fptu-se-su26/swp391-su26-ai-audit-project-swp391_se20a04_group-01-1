const weatherClient = require('../utils/weatherClient');

// Giả lập db.js và mssql
jest.mock('../db', () => {
    const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
            recordset: []
        })
    };
    const mockPool = {
        request: jest.fn(() => mockRequest)
    };
    return {
        sql: {
            Int: 'INT',
            NVarChar: 'NVARCHAR',
            Decimal: 'DECIMAL',
            Bit: 'BIT',
            DateTime: 'DATETIME',
            MAX: 'MAX',
            Table: jest.fn().mockImplementation(() => {
                return {
                    columns: { add: jest.fn() },
                    rows: { add: jest.fn() }
                };
            })
        },
        poolPromise: Promise.resolve(mockPool)
    };
});

describe('Weather Client Tests', () => {
    beforeEach(() => {
        // Reset weather data before each test
        weatherClient.updateMockWeather('Liên Chiểu', { rain1h: 0, temp: 29.5 });
    });

    test('should return supported districts of Da Nang', () => {
        const districts = weatherClient.getSupportedDistricts();
        expect(districts).toContain('Liên Chiểu');
        expect(districts).toContain('Hải Châu');
        expect(districts).toContain('Sơn Trà');
        expect(districts.length).toBe(7);
    });

    test('should return mock weather when API key is missing', async () => {
        // Ensure env variable is not set or placeholder
        const oldKey = process.env.OPENWEATHER_API_KEY;
        delete process.env.OPENWEATHER_API_KEY;

        const weather = await weatherClient.getWeatherForDistrict('Liên Chiểu');
        expect(weather.district).toBe('Liên Chiểu');
        expect(weather.rain1h).toBe(0);

        process.env.OPENWEATHER_API_KEY = oldKey;
    });

    test('should successfully update mock weather data', () => {
        const oldKey = process.env.OPENWEATHER_API_KEY;
        delete process.env.OPENWEATHER_API_KEY;

        const result = weatherClient.updateMockWeather('Liên Chiểu', {
            rain1h: 55.2,
            temp: 24.0,
            status: 'Rain',
            description: 'mưa rất lớn'
        });

        expect(result.rain1h).toBe(55.2);
        expect(result.temp).toBe(24.0);
        expect(result.status).toBe('Rain');
        
        // Check cache has been updated
        return weatherClient.getWeatherForDistrict('Liên Chiểu').then(weather => {
            expect(weather.rain1h).toBe(55.2);
            process.env.OPENWEATHER_API_KEY = oldKey;
        });
    });
});

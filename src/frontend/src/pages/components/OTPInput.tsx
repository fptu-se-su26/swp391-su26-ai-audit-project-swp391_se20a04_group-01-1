import React, { useState, useRef, useEffect } from 'react';
import { OTP_LENGTH } from '../../config/auth';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = OTP_LENGTH,
  value,
  onChange,
  onComplete
}) => {
  const [otp, setOTP] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));

  // ĐÃ SỬA LỖI TẠI ĐÂY: Đảm bảo mảng luôn đủ số phần tử (length)
  useEffect(() => {
    const newOTPArray = Array(length).fill(''); // Tạo mảng mặc định toàn chuỗi rỗng
    
    // Ghi đè các giá trị đã có từ prop `value` vào mảng
    if (value) {
      value.split('').slice(0, length).forEach((char, index) => {
        newOTPArray[index] = char;
      });
    }
    
    setOTP(newOTPArray);
  }, [value, length]);

  const handleChange = (index: number, inputValue: string) => {
    if (!/^\d*$/.test(inputValue)) return; // Only allow digits

    const newOTP = [...otp];
    newOTP[index] = inputValue.slice(-1); // Take only last character
    setOTP(newOTP);

    const otpString = newOTP.join('');
    onChange(otpString);

    // Move to next input
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are filled
    if (newOTP.every((digit) => digit !== '') && onComplete) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const newOTP = [...otp];
      newOTP[index] = '';
      setOTP(newOTP);
      onChange(newOTP.join(''));

      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d+$/.test(pastedData)) return;

    const pastedOTP = pastedData.split('').slice(0, length);
    
    // Đảm bảo mảng dán vào cũng đủ length
    const paddedOTP = Array(length).fill('');
    pastedOTP.forEach((char, index) => {
      paddedOTP[index] = char;
    });

    setOTP(paddedOTP);
    const otpString = paddedOTP.join('');
    onChange(otpString);

    if (paddedOTP.every((digit) => digit !== '') && onComplete) {
      onComplete(otpString);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
        />
      ))}
    </div>
  );
};

export default OTPInput;
import { describe, expect, it } from "vitest";
import { detectOtp, previewEmailText } from "../src/utils/email.js";

describe("email utilities", () => {
  it("detects verification codes with surrounding email copy", () => {
    expect(detectOtp({ text: "Your verification code is 123456." })).toBe("123456");
    expect(detectOtp({ text: "Use 948-221 as your login code." })).toBe("948221");
    expect(detectOtp({ html: "<p>Your one-time code:</p><strong>A1B2C3</strong>" })).toBe("A1B2C3");
  });

  it("does not extract URL or asset-path digits as codes", () => {
    const html = `
      <center>
        <img src="https://assets.example.com/email/2026/0622/logo123456.png" />
        <a href="https://example.com/reset/987654?asset=1234">Reset password</a>
      </center>
    `;

    expect(detectOtp({ html })).toBeNull();
    expect(previewEmailText({ html })).toBe("Reset password");
  });
});

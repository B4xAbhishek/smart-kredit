/** Send SMS via Authkey.io */

export async function sendOtpSms(
  phoneE164: string,
  otp: string,
): Promise<boolean> {
  const authkey = process.env.AUTHKEY_API_KEY;
  const sender = process.env.AUTHKEY_SENDER_ID || "SMTKRD";

  if (!authkey) {
    console.error("AUTHKEY_API_KEY is not set");
    return false;
  }

  // phoneE164 = "+919876543210" → mobile = "9876543210", country_code = "91"
  const mobile = phoneE164.replace(/^\+91/, "");
  const countryCode = "91";

  const params = new URLSearchParams({
    authkey,
    sms: `${otp} is your Smart Kredit verification code. Do not share it with anyone.`,
    mobile,
    country_code: countryCode,
    sender,
  });

  try {
    const res = await fetch(
      `https://console.authkey.io/request?${params.toString()}`,
    );
    if (!res.ok) return false;
    return true;
  } catch (err) {
    console.error("Authkey SMS error:", err);
    return false;
  }
}

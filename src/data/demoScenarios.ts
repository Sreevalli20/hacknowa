export interface DemoScenario {
  id: string;
  name: string;
  category: 'SMS' | 'URL' | 'QR' | 'COMBINED' | 'BENIGN';
  badge: string;
  description: string;
  messageText?: string;
  urlText?: string;
  qrDecodedText?: string;
  sampleQrImageDataUrl?: string;
}

// Generate a valid QR code data URL using SVG canvas for the demo QR
function createDemoQrDataUrl(text: string): string {
  // Simple fallback placeholder if needed, but we can also decode QR in browser
  return '';
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'urgent_sms',
    name: 'Urgent Banking Security Alert (SMS)',
    category: 'SMS',
    badge: 'Urgency + Phishing Link',
    description: 'High-urgency SMS masquerading as bank fraud department demanding identity verification within 15 minutes.',
    messageText: 'SECURITY ALERT: Unauthorized sign-in attempt detected on your checking account from IP 185.220.101.5 (Moscow, RU). Your online banking access will be locked in 15 minutes unless verified. Review activity and confirm your identity immediately at: https://secure-login.chase-account-verify.net/portal/auth',
    urlText: 'https://secure-login.chase-account-verify.net/portal/auth',
  },
  {
    id: 'bare_ip_url',
    name: 'Bare IP Credential Harvesting URL',
    category: 'URL',
    badge: 'Deceptive Hostname + Insecure HTTP',
    description: 'URL hosted directly on a bare numerical IP with non-standard port and credential verification path.',
    urlText: 'http://192.168.1.100:8080/auth/login/update-password.php?ref=billing_verify&user_session=temp',
  },
  {
    id: 'crypto_qr',
    name: 'Suspicious Giveaway / Airdrop (QR Code)',
    category: 'QR',
    badge: 'Quishing / Seed Solicitation',
    description: 'Cryptocurrency claiming QR code that prompts connection of wallet and seed phrase confirmation.',
    messageText: 'Scan this code to claim 500 USDT rewards before the daily allocation pool expires.',
    qrDecodedText: 'https://claim-airdrop-rewards.usdt-bonus-portal.cc/connect?vault=true',
  },
  {
    id: 'combined_mfa',
    name: 'IT Helpdesk MFA Bypass Solicitation',
    category: 'COMBINED',
    badge: 'MFA Intercept + Social Engineering',
    description: 'Helpdesk impersonation requesting an urgent OTP code to prevent mailbox deactivation.',
    messageText: 'IT Support Notification: Your corporate email session will terminate today due to pending security certificate update. Reply with the 6-digit Microsoft Authenticator code sent to your phone or verify at the link below to preserve mailbox continuity.',
    urlText: 'https://login.microsoftonline.com.corporate-sso-gateway.xyz/adfs/ls/',
  },
  {
    id: 'benign_meeting',
    name: 'Legitimate Calendar Invite Link (Benign Baseline)',
    category: 'BENIGN',
    badge: 'Low Risk Expected Baseline',
    description: 'Routine calendar invitation to verify that TRACEZERO does not generate false alarms on standard communications.',
    messageText: 'Hi Sarah, looking forward to our quarterly product review on Thursday at 2 PM PST. Attached is the Google Meet link: https://meet.google.com/abc-defg-hij. Let me know if you need to reschedule.',
    urlText: 'https://meet.google.com/abc-defg-hij',
  },
];

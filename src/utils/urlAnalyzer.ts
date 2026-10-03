import { URLStructuralAnalysis, StructuralFlag } from '../types/investigation';

const SUSPICIOUS_KEYWORDS = [
  'login', 'signin', 'sign-in', 'log-in', 'verify', 'verification', 'update',
  'account', 'security', 'secure', 'banking', 'wallet', 'password', 'credential',
  'reset', 'confirm', 'billing', 'authorize', 'session', 'webscr', 'cmd=_login',
  'support-desk', 'portal-auth', 'restore', 'suspend', 'urgent-action', 'action-required'
];

const CREDENTIAL_PATHS = [
  '/login', '/signin', '/auth', '/authenticate', '/credential', '/password',
  '/verify', '/session', '/checkpoint', '/account/login', '/user/auth', '/wp-login.php'
];

const DOWNLOAD_EXTENSIONS = [
  '.exe', '.scr', '.bat', '.cmd', '.vbs', '.js', '.jar', '.apk', '.dmg',
  '.iso', '.bin', '.msi', '.ps1', '.sh', '.zip', '.rar', '.7z', '.tar.gz'
];

const KNOWN_LEGIT_BRANDS = [
  'google', 'apple', 'microsoft', 'amazon', 'paypal', 'netflix', 'chase',
  'wellsfargo', 'bankofamerica', 'citibank', 'facebook', 'instagram', 'whatsapp'
];

/**
 * Genuine local structural URL analyzer.
 * Strictly relies on RFC 3986 parsing and deterministic heuristic inspection.
 * Zero fabricated WHOIS or external reputation.
 */
export function analyzeUrlStructure(rawInput: string): URLStructuralAnalysis {
  let cleaned = rawInput.trim();
  if (!cleaned) {
    return createEmptyAnalysis(rawInput);
  }

  // Prepend protocol if missing to allow standard URL parsing
  let normalized = cleaned;
  if (!/^https?:\/\//i.test(normalized)) {
    // If it starts with another scheme like ftp or file
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(normalized)) {
      // Keep as-is
    } else {
      normalized = 'https://' + normalized;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      ...createEmptyAnalysis(rawInput),
      structuralFlags: [
        {
          name: 'Malformed URL Syntax',
          severity: 'high',
          details: 'Input could not be parsed as a valid RFC 3986 Uniform Resource Identifier.',
        },
      ],
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol;
  const port = parsed.port;
  const pathname = parsed.pathname;
  const search = parsed.search;

  // Extract query parameters
  const searchParams: { key: string; value: string }[] = [];
  parsed.searchParams.forEach((value, key) => {
    searchParams.push({ key, value });
  });

  // Check IP address hostname
  const isIpv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname);
  const isIpv6 = /^\[?[0-9a-fA-F:]+\]?$/.test(hostname) && hostname.includes(':');
  const isIpAddress = isIpv4 || isIpv6;

  // Subdomain splitting
  const hostParts = hostname.split('.');
  const subdomains: string[] = [];
  let subdomainDepth = 0;

  if (!isIpAddress && hostParts.length > 2) {
    // Basic eTLD heuristic (handling common two-part TLDs like .co.uk, .com.au)
    const isTwoPartTld = hostParts.length >= 3 && ['co', 'com', 'org', 'net', 'edu', 'gov'].includes(hostParts[hostParts.length - 2]);
    const domainPartCount = isTwoPartTld ? 3 : 2;
    if (hostParts.length > domainPartCount) {
      const subs = hostParts.slice(0, hostParts.length - domainPartCount);
      subdomains.push(...subs);
      subdomainDepth = subs.length;
    }
  }

  // Punycode & Unicode indicators
  const hasPunycode = hostname.includes('xn--') || /[\u0080-\uFFFF]/.test(rawInput);

  // Suspicious encoding
  const hasSuspiciousEncoding = /%[0-9a-fA-F]{2}/.test(parsed.pathname) ||
    /%25[0-9a-fA-F]{2}/i.test(rawInput) || // double percent encoding
    /@/.test(parsed.pathname) ||
    /\\/.test(rawInput); // backslash obfuscation

  // Userinfo present (e.g. http://google.com@evil.com)
  const userInfoPresent = parsed.username.length > 0 || parsed.password.length > 0 || /^[a-zA-Z]+:\/\/[^/]*@/.test(cleaned);

  // Keyword detection in hostname and path
  const lowerFull = (hostname + pathname + search).toLowerCase();
  const detectedSuspiciousKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => lowerFull.includes(kw));

  // Credential path indicators
  const credentialPathIndicators = CREDENTIAL_PATHS.filter((cp) => pathname.toLowerCase().includes(cp));

  // Download indicators
  const downloadIndicators = DOWNLOAD_EXTENSIONS.filter((ext) => pathname.toLowerCase().endsWith(ext) || lowerFull.includes(ext + '?'));

  // Port anomaly check
  const portAnomaly = !!(port && !['80', '443'].includes(port));

  // Compile structural flags
  const flags: StructuralFlag[] = [];

  if (protocol === 'http:') {
    flags.push({
      name: 'Unencrypted HTTP Protocol',
      severity: 'medium',
      details: 'Connection is transmitted in cleartext without TLS certificate encryption.',
    });
  }

  if (isIpAddress) {
    flags.push({
      name: 'Bare IP Hostname',
      severity: 'critical',
      details: `Destination uses a numerical IP address (${hostname}) instead of a registered domain name, common in phishing and ad-hoc staging infrastructure.`,
    });
  }

  if (userInfoPresent) {
    flags.push({
      name: 'Userinfo @ Prefix Confusion',
      severity: 'critical',
      details: 'URL uses user authentication syntax (@) before hostname to visually mask the actual destination server.',
    });
  }

  if (hasPunycode) {
    flags.push({
      name: 'IDN / Punycode (xn--) Homograph Risk',
      severity: 'high',
      details: 'Hostname contains Internationalized Domain Name encoding, often used in lookalike homoglyph impersonation attacks.',
    });
  }

  if (subdomainDepth >= 3) {
    flags.push({
      name: 'Excessive Subdomain Depth',
      severity: 'high',
      details: `Contains ${subdomainDepth} subdomain levels (${subdomains.join('.')}), a technique often used to disguise actual parent domains.`,
    });
  }

  // Brand spoofing in subdomains check (e.g., paypal.com.something.xyz)
  for (const brand of KNOWN_LEGIT_BRANDS) {
    if (subdomains.some((s) => s.includes(brand)) && !hostname.endsWith(`${brand}.com`) && !hostname.endsWith(`${brand}.org`)) {
      flags.push({
        name: `Brand Impersonation in Subdomain (${brand})`,
        severity: 'critical',
        details: `Subdomain labels include "${brand}" while the authoritative root domain is different.`,
      });
      break;
    }
  }

  if (downloadIndicators.length > 0) {
    flags.push({
      name: 'Direct Executable/Archive Download Path',
      severity: 'high',
      details: `Path directly targets an executable or compressed file type (${downloadIndicators.join(', ')}).`,
    });
  }

  if (credentialPathIndicators.length > 0 && protocol === 'http:') {
    flags.push({
      name: 'Cleartext Credential Submission Path',
      severity: 'critical',
      details: `Authentication endpoint (${credentialPathIndicators.join(', ')}) served without encryption.`,
    });
  }

  if (portAnomaly) {
    flags.push({
      name: 'Non-Standard Web Port',
      severity: 'medium',
      details: `Uses non-standard web port ${port} instead of standard HTTP/HTTPS ports (80/443).`,
    });
  }

  if (hasSuspiciousEncoding) {
    flags.push({
      name: 'Unusual Character Encoding / Obfuscation',
      severity: 'medium',
      details: 'URL contains encoded bytes or directory separator anomalies aimed at evading static filters.',
    });
  }

  const notVerifiedAspects: string[] = [];

  // Only add notVerifiedAspects if we have a valid URL to analyze
  if (parsed) {
    notVerifiedAspects.push('Domain registration date and WHOIS ownership records (not verified - no external registrar database accessed).');
    notVerifiedAspects.push('External reputation scores or blacklists (not verified - no third-party feeds queried).');
    notVerifiedAspects.push('Server-side payload and backend response status (not verified - URL was not executed or resolved over the network).');
    notVerifiedAspects.push('TLS certificate authority chain and validity status (not verified locally).');
  }

  return {
    originalInput: rawInput,
    isValidUrl: true,
    protocol,
    hostname,
    port,
    pathname,
    search,
    searchParams,
    subdomains,
    subdomainDepth,
    isIpAddress,
    hasPunycode,
    hasSuspiciousEncoding,
    detectedSuspiciousKeywords,
    credentialPathIndicators,
    downloadIndicators,
    portAnomaly,
    userInfoPresent,
    structuralFlags: flags,
    notVerifiedAspects,
  };
}

function createEmptyAnalysis(rawInput: string): URLStructuralAnalysis {
  return {
    originalInput: rawInput,
    isValidUrl: false,
    protocol: '',
    hostname: '',
    port: '',
    pathname: '',
    search: '',
    searchParams: [],
    subdomains: [],
    subdomainDepth: 0,
    isIpAddress: false,
    hasPunycode: false,
    hasSuspiciousEncoding: false,
    detectedSuspiciousKeywords: [],
    credentialPathIndicators: [],
    downloadIndicators: [],
    portAnomaly: false,
    userInfoPresent: false,
    structuralFlags: [],
    notVerifiedAspects: [
      'No valid URL structure supplied for static analysis.'
    ],
  };
}

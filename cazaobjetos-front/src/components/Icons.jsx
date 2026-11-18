// Íconos de trazo lineal 1.75 px, esquinas redondeadas (guía de estilo)
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const I = (children) => (props) => <svg {...base} {...props}>{children}</svg>

export const IconGrid = I(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>)
export const IconPlus = I(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>)
export const IconClipboard = I(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>)
export const IconShield = I(<><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>)
export const IconSearch = I(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>)
export const IconUser = I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>)
export const IconInfo = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>)
export const IconCheck = I(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>)
export const IconSend = I(<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />)
export const IconX = I(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>)
export const IconImage = I(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>)
export const IconUpload = I(<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M12 17v-6M9.5 13.5L12 11l2.5 2.5" /></>)
export const IconCalendar = I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>)
export const IconPin = I(<><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>)
export const IconArrowRight = I(<path d="M5 12h14M13 6l6 6-6 6" />)
export const IconBack = I(<path d="M19 12H5M11 18l-6-6 6-6" />)
export const IconDownload = I(<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />)
export const IconBox = I(<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>)
export const IconEdit = I(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>)
export const IconMail = I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>)
export const IconLock = I(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>)
export const IconTrash = I(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>)

export const IconEye = I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>)
export const IconEyeOff = I(<><path d="M3 3l18 18M9.9 5.2A12 12 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.1 4M6.2 6.2A19 19 0 002 12s3.5 7 10 7a12 12 0 005.8-1.8M9.9 9.9a3 3 0 004.2 4.2" /></>)

export const IconLogout = I(<><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4M9 12h12M17 8l4 4-4 4" /></>)

export const IconSun = I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>)
export const IconMoon = I(<path d="M20.8 13A9 9 0 0111 3.2 9 9 0 1020.8 13z" />)
export const IconMonitor = I(<><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>)

export const IconBell = I(<><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>)

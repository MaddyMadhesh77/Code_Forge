export const languages = ["python", "javascript", "cpp", "java"] as const;

export type Language = (typeof languages)[number];

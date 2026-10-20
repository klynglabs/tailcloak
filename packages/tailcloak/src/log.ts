export const formatMessage = (message: string): string => `[tailcloak] ${message}`;

const list = new Intl.ListFormat("en", { type: "conjunction" });

export const formatList = (items: string[]): string => list.format(items);

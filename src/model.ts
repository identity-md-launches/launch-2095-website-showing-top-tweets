import data from "./posts.json";
export type Post = (typeof data)[number];
export type Topic = "All posts" | "Builds" | "Swarm" | "Community";
export type Sort = "likes" | "reposts" | "newest";
export const posts: Post[] = data;
export const topics: Topic[] = ["All posts", "Builds", "Swarm", "Community"];
export const bookmarkKey = "the-pond:saved:v1";
export function filterPosts(
  query: string,
  topic: Topic,
  sort: Sort,
  savedOnly: boolean,
  saved: string[],
): Post[] {
  const term = query.trim().toLocaleLowerCase();
  return posts
    .filter(
      (p) =>
        (!savedOnly || saved.includes(p.id)) &&
        (topic === "All posts" || p.topic === topic) &&
        `${p.author} ${p.handle} ${p.text} ${p.topic}`
          .toLocaleLowerCase()
          .includes(term),
    )
    .sort(
      (a, b) =>
        (sort === "likes"
          ? b.likes - a.likes
          : sort === "reposts"
            ? b.reposts - a.reposts
            : b.timestamp - a.timestamp) || b.timestamp - a.timestamp,
    );
}
export function loadBookmarks(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(bookmarkKey) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter(
          (id): id is string =>
            typeof id === "string" && posts.some((p) => p.id === id),
        )
      : [];
  } catch {
    return [];
  }
}
export const compact = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));

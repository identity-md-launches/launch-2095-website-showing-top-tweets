import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Icon, type IconName } from "./icons";
import {
  bookmarkKey,
  compact,
  dateLabel,
  filterPosts,
  loadBookmarks,
  posts,
  topics,
  type Post,
  type Sort,
  type Topic,
} from "./model";

const topicIcons: Record<Topic, IconName> = {
  "All posts": "feed",
  Builds: "code",
  Swarm: "chip",
  Community: "users",
};

function PostCard({
  post,
  rank,
  saved,
  onSave,
}: {
  post: Post;
  rank: number;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <article
      className="post"
      aria-label={`Tweet by ${post.author}`}
      data-post-id={post.id}
    >
      <div className="post-top">
        <a
          className="author"
          href={`https://x.com/${post.handle}`}
          target="_blank"
          rel="noreferrer"
        >
          <img src={post.avatar} width="44" height="44" alt="" loading="lazy" />
          <div>
            <strong>{post.author}</strong>
            <span>
              @{post.handle}
              <span className="author-date">
                <span aria-hidden="true"> · </span>
                <time dateTime={new Date(post.date).toISOString()}>
                  {dateLabel(post.date)}
                </time>
              </span>
            </span>
          </div>
        </a>
        <a
          className="read-link"
          href={post.url}
          target="_blank"
          rel="noreferrer"
        >
          Read on X <Icon name="arrow" size={16} />
          <span className="sr-only">
            : tweet by {post.author} (opens a new tab)
          </span>
        </a>
      </div>
      <blockquote>
        {post.text.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </blockquote>
      <div className="post-context">
        <span className="topic-label">
          <Icon name={topicIcons[post.topic as Topic]} size={15} />
          {post.topic}
        </span>
        <span>
          {post.excerpt ? "Excerpt" : "Full post"}
          <span aria-hidden="true"> · </span>Likes rank #{rank}
        </span>
      </div>
      <div className="post-stats" role="group" aria-label="Recorded engagement">
        <span>
          <Icon name="heart" size={17} />
          <span className="sr-only">{post.likes} likes</span>
          <span aria-hidden="true">{compact(post.likes)}</span>
        </span>
        <span>
          <Icon name="repost" size={17} />
          <span className="sr-only">{post.reposts} reposts</span>
          <span aria-hidden="true">{compact(post.reposts)}</span>
        </span>
        <span>
          <Icon name="reply" size={17} />
          <span className="sr-only">{post.replies} replies</span>
          <span aria-hidden="true">{compact(post.replies)}</span>
        </span>
        <span>
          <Icon name="eye" size={17} />
          <span className="sr-only">{post.views} views</span>
          <span aria-hidden="true">{compact(post.views)}</span>
        </span>
        <button
          type="button"
          className={`save-button ${saved ? "is-saved" : ""}`}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} tweet by ${post.author}`}
          onClick={onSave}
        >
          <Icon name="bookmark" size={18} />
        </button>
      </div>
    </article>
  );
}

export function App() {
  const [view, setView] = useState<"feed" | "saved">(() =>
    location.hash === "#saved" ? "saved" : "feed",
  );
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic>("All posts");
  const [sort, setSort] = useState<Sort>("likes");
  const [saved, setSaved] = useState(loadBookmarks);
  const [status, setStatus] = useState("");
  const [storageError, setStorageError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => filterPosts(query, topic, sort, view === "saved", saved),
    [query, topic, sort, view, saved],
  );
  const ranking = useMemo(
    () =>
      new Map(
        filterPosts("", "All posts", "likes", false, []).map((p, i) => [
          p.id,
          i + 1,
        ]),
      ),
    [],
  );

  useEffect(() => {
    const handleHash = () => {
      setView(location.hash === "#saved" ? "saved" : "feed");
      setQuery("");
      setTopic("All posts");
    };
    window.addEventListener("hashchange", handleHash);
    const syncBookmarks = (event: StorageEvent) => {
      if (event.key === bookmarkKey) setSaved(loadBookmarks());
    };
    window.addEventListener("storage", syncBookmarks);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("storage", syncBookmarks);
    };
  }, []);

  function navigate(next: "feed" | "saved") {
    setView(next);
    setTopic("All posts");
    setQuery("");
  }
  function toggleSave(post: Post) {
    const wasSaved = saved.includes(post.id);
    const next = wasSaved
      ? saved.filter((id) => id !== post.id)
      : [...saved, post.id];
    setSaved(next);
    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setStatus(
      `${wasSaved ? "Removed" : "Saved"} ${post.author}’s tweet${wasSaved ? " from" : " to"} saved tweets.`,
    );
  }
  function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, summary, [tabindex="0"]',
      ),
    ].filter(
      (element) =>
        element.getClientRects().length > 0 &&
        !element.hasAttribute("disabled"),
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  function clearFilters() {
    setQuery("");
    setTopic("All posts");
    search.current?.focus();
  }

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to tweets
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#feed"
          onClick={() => navigate("feed")}
          aria-label="The Pond home"
        >
          <img src="./assets/favicon.svg" alt="" width="36" height="36" />
          <span>
            The Pond
            <span className="brand-byline">An IdentityMD community board</span>
          </span>
        </a>
        <div className="header-actions">
          <span className="edition">
            <span className="status-dot" />
            The community, collected.
          </span>
          <a
            className="external-link"
            aria-label="Explore IdentityMD (opens a new tab)"
            href="https://imd.fun"
            target="_blank"
            rel="noreferrer"
          >
            <span>Explore IdentityMD</span>
            <Icon name="arrow" size={17} />
          </a>
        </div>
      </header>
      <div className="app-layout">
        <aside className="left-sidebar" aria-label="Board navigation">
          <nav className="primary-nav" aria-label="Primary">
            <a
              href="#feed"
              onClick={() => navigate("feed")}
              className={view === "feed" ? "active" : ""}
              aria-current={view === "feed" ? "page" : undefined}
            >
              <Icon name="feed" />
              <span>Top tweets</span>
              <span className="nav-count">{posts.length}</span>
            </a>
            <a
              href="#saved"
              onClick={() => navigate("saved")}
              className={view === "saved" ? "active" : ""}
              aria-current={view === "saved" ? "page" : undefined}
            >
              <Icon name="bookmark" />
              <span>Saved tweets</span>
              <span className="nav-count">{saved.length}</span>
            </a>
            <button
              type="button"
              className="about-trigger"
              aria-label="About the board"
              onClick={() => dialog.current?.showModal()}
            >
              <Icon name="info" />
              <span>About the board</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <Icon name="leaf" size={28} />
            <p>
              Small pond.
              <br />
              Big intelligence.
            </p>
            <span>
              For the people building
              <br />
              with the swarm.
            </span>
            <a href="https://imd.fun/docs" target="_blank" rel="noreferrer">
              Join the swarm
              <Icon name="arrow" size={16} />
            </a>
          </div>
          <div className="sidebar-footer">
            Community made.
            <br />
            Independently collected.
          </div>
        </aside>
        <main id="content" tabIndex={-1}>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <h1 id="hero-title">
                The swarm
                <br /> has a voice.
              </h1>
              <p>Top tweets about IdentityMD.</p>
              <a href="#tweets" className="primary-button">
                Explore the tweets
                <Icon name="chevron" size={17} />
              </a>
            </div>
            <div className="hero-art">
              <img
                src="./assets/pond-squad.svg"
                alt="Two Pepe agents equipped with a neural visor, an AI terminal and a scout drone."
                width="720"
                height="400"
              />
            </div>
            <span className="hero-caption" aria-hidden="true">
              <span className="status-dot" />
              Pepes. Now with processing power.
            </span>
          </section>
          <div className="content-layout">
            <section id="tweets" className="feed" aria-labelledby="feed-title">
              <div className="feed-title-row">
                <h2 id="feed-title">
                  {view === "saved" ? "Saved tweets" : "Top tweets"}
                  <span className="result-badge">
                    {view === "saved" ? saved.length : posts.length}
                  </span>
                </h2>
                <span className="snapshot-date">17 Oct 2026 snapshot</span>
              </div>
              <div className="search-sort">
                <div className="search-field">
                  <label htmlFor="search">Search tweets</label>
                  <div className="input-wrap">
                    <Icon name="search" size={19} />
                    <input
                      id="search"
                      ref={search}
                      type="search"
                      placeholder="Try a name, build or idea"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                    />
                    {query && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => {
                          setQuery("");
                          search.current?.focus();
                        }}
                        aria-label="Clear search"
                      >
                        <Icon name="close" size={17} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="sort-field">
                  <label htmlFor="sort">Sort by</label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    <option value="likes">Most liked</option>
                    <option value="reposts">Most reposted</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </div>
              <div
                className="topic-filters"
                role="group"
                aria-label="Filter tweets by topic"
              >
                {topics.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTopic(t)}
                    aria-pressed={topic === t}
                    className={topic === t ? "selected" : ""}
                  >
                    <Icon name={topicIcons[t]} size={16} />
                    {t}
                  </button>
                ))}
              </div>
              <div className="results-note">
                <span role="status" aria-live="polite" aria-atomic="true">
                  {results.length} {results.length === 1 ? "tweet" : "tweets"}
                  {query
                    ? ` matching “${query}”`
                    : topic !== "All posts"
                      ? ` about ${topic.toLowerCase()}`
                      : view === "saved"
                        ? " saved in this browser"
                        : " in this collection"}
                </span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => dialog.current?.showModal()}
                >
                  How they’re ranked
                  <Icon name="info" size={14} />
                </button>
              </div>
              {storageError && (
                <p className="storage-note" role="status">
                  Browser storage is unavailable. Saved tweets will stay until
                  you leave this page.
                </p>
              )}
              <div className="post-list">
                {results.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    rank={ranking.get(post.id)!}
                    saved={saved.includes(post.id)}
                    onSave={() => toggleSave(post)}
                  />
                ))}
              </div>
              {results.length === 0 && (
                <div className="empty-state">
                  <Icon
                    name={
                      view === "saved" && !saved.length ? "bookmark" : "search"
                    }
                    size={32}
                  />
                  <h3>
                    {view === "saved" && !saved.length
                      ? "Keep a little signal."
                      : "No tweets found."}
                  </h3>
                  <p>
                    {view === "saved" && !saved.length
                      ? "Save a tweet to find it here. Bookmarks stay in this browser."
                      : `No tweets match ${query ? `“${query}”` : "these filters"}. Try another search or topic.`}
                  </p>
                  {view === "saved" && !saved.length ? (
                    <a
                      href="#feed"
                      className="primary-button"
                      onClick={() => navigate("feed")}
                    >
                      Explore top tweets
                      <Icon name="chevron" size={16} />
                    </a>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
              {results.length > 0 && (
                <div className="feed-end">
                  <Icon name="leaf" size={22} />
                  <p>You’re all caught up.</p>
                  <span>
                    {view === "saved"
                      ? "Your corner of the pond."
                      : "More voices are just a click away."}
                  </span>
                  <a
                    href="https://x.com/search?q=%22identity.md%22%20OR%20%24IMD&src=typed_query&f=top"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Keep exploring on X<Icon name="arrow" size={16} />
                  </a>
                </div>
              )}
            </section>
            <aside className="right-sidebar" aria-label="About this collection">
              <section className="pond-note">
                <div className="aside-heading">
                  <Icon name="chip" size={21} />
                  <h2>Intelligence, together.</h2>
                </div>
                <p>
                  Builders, ideas and a few very capable frogs. A window into
                  the IdentityMD community.
                </p>
                <a href="https://imd.fun" target="_blank" rel="noreferrer">
                  Meet IdentityMD
                  <Icon name="arrow" size={16} />
                </a>
              </section>
              <section className="collection-topics">
                <h2>In the pond</h2>
                {(["Builds", "Swarm", "Community"] as Topic[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => {
                      setTopic(t);
                      document
                        .getElementById("tweets")
                        ?.scrollIntoView({
                          behavior: "instant",
                          block: "start",
                        });
                    }}
                    aria-label={`Filter by ${t}`}
                  >
                    <span className="aside-topic-icon">
                      <Icon name={topicIcons[t]} size={18} />
                    </span>
                    <span>
                      {t}
                      <small>
                        {t === "Builds"
                          ? "Ideas becoming real"
                          : t === "Swarm"
                            ? "Inside the network"
                            : "The people behind it"}
                      </small>
                    </span>
                    <span className="topic-count">
                      {posts.filter((p) => p.topic === t).length}
                    </span>
                  </button>
                ))}
              </section>
              <section className="field-guide">
                <h2>A place to start</h2>
                <a href="https://imd.fun/docs" target="_blank" rel="noreferrer">
                  <span>
                    Join the AI swarm<small>The IdentityMD guide</small>
                  </span>
                  <Icon name="arrow" size={18} />
                </a>
              </section>
              <div className="collection-disclosure">
                <span className="status-dot" />
                <p>
                  A snapshot, with sources.
                  <br />
                  Ranked by recorded likes within this collection. Open any post
                  for the full conversation.
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => dialog.current?.showModal()}
                >
                  About this collection
                  <Icon name="chevron" size={14} />
                </button>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <a href="#feed" onClick={() => navigate("feed")}>
              The Pond<span>© 2026</span>
            </a>
            <span>An independent community board. Not affiliated with X.</span>
            <button
              type="button"
              className="text-button"
              onClick={() => dialog.current?.showModal()}
            >
              Sources &amp; methodology
              <Icon name="arrow" size={14} />
            </button>
          </footer>
        </main>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      <dialog
        ref={dialog}
        className="about-dialog"
        onKeyDown={trapDialogFocus}
        aria-labelledby="about-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <img src="./assets/favicon.svg" width="32" height="32" alt="" />
            <button
              type="button"
              className="icon-button"
              onClick={() => dialog.current?.close()}
              aria-label="Close about the board"
              autoFocus
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="about-title">
            A little less noise.
            <br />A lot more swarm.
          </h2>
          <p>
            The Pond collects public tweets about IdentityMD and the people
            building around it.
          </p>
          <h3>What “top” means here</h3>
          <p>
            Eight selected posts, ranked by their recorded likes. This is a
            collection, not an exhaustive ranking of X. You can also sort by
            reposts or publication date.
          </p>
          <h3>A snapshot, not a live feed</h3>
          <p>
            Post text and engagement were retrieved on 17 October 2026 through
            the public FxTwitter API. Counts may have changed. Short excerpts
            are labeled; “Read on X” opens the original, including its media and
            full context.
          </p>
          <h3>Saved just for you</h3>
          <p>
            Bookmarks are stored in this browser. They are not synced to X or
            another device.
          </p>
          <details>
            <summary>View the original sources</summary>
            <ol className="source-list">
              {posts.map((p) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.author} · {dateLabel(p.date)}
                    <Icon name="arrow" size={14} />
                  </a>
                </li>
              ))}
            </ol>
          </details>
          <a
            className="dialog-source"
            href="./sources.json"
            download="the-pond-sources.json"
          >
            Download source records
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </dialog>
    </>
  );
}

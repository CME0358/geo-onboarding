import { useState, useEffect, useRef } from "react";

// ── 質問フロー定義 ──────────────────────────────────────────────────────────
const FLOW = [
  {
    id: "intro",
    type: "message",
    text: "こんにちは！\nGEO Search Protocol の事前準備ヒアリングを始めます。\n\n全部で約5〜7分で完了します。「わからない」は弊社が確認するので、気にせずそのまま進めてください 👌",
    next: "cms",
  },

  // ── CMS ─────────────────────────────────────────────────────────
  {
    id: "cms",
    type: "select",
    category: "🖥 サイト技術環境",
    question: "まず、御社サイトのCMS（更新システム）を教えてください。",
    options: ["WordPress", "Wix", "Shopify", "自社開発・オリジナル", "わからない"],
    key: "cms",
    next: "https_check",
  },
  {
    id: "https_check",
    type: "select",
    category: "🖥 サイト技術環境",
    question: "サイトのURLは「https://」から始まっていますか？",
    options: ["はい（https）", "いいえ（http）", "わからない"],
    key: "https",
    next: "site_admin",
  },
  {
    id: "site_admin",
    type: "text",
    category: "🖥 サイト技術環境",
    question: "サイトの管理・更新を担当している方のお名前と連絡先（メールまたはお名前だけでもOK）を教えてください。\nPhase 3の実装時にご連絡します。",
    placeholder: "例：田中 太郎 / tanaka@example.com",
    key: "site_admin",
    next: "cloudflare",
  },

  // ── クローラー ───────────────────────────────────────────────────
  {
    id: "cloudflare",
    type: "select",
    category: "🤖 クローラー環境",
    question: "Cloudflare（クラウドフレア）を使っていますか？\n\nサイトを高速化・保護するサービスです。契約しているサーバーやドメイン管理画面で確認できます。",
    options: ["使っている", "使っていない", "わからない"],
    key: "cloudflare",
    next: (ans) => ans === "使っている" ? "cloudflare_botfight" : "waf_other",
  },
  {
    id: "cloudflare_botfight",
    type: "select",
    category: "🤖 クローラー環境",
    question: "Cloudflareの管理画面で「Bot Fight Mode」がオンになっていますか？\n\n⚠ オンのままだとAIクローラーが全ブロックされ、GEO施策が無効になります。",
    options: ["オンになっている", "オフになっている", "わからない・確認できない"],
    key: "cloudflare_botfight",
    next: "waf_other",
  },
  {
    id: "waf_other",
    type: "select",
    category: "🤖 クローラー環境",
    question: "Wordfence・Sucuri・SiteGround WAFなど、\nセキュリティプラグインやWAFを使っていますか？",
    options: ["使っている", "使っていない", "わからない"],
    key: "waf_other",
    next: "overseas_ip",
  },
  {
    id: "overseas_ip",
    type: "select",
    category: "🤖 クローラー環境",
    question: "海外からのアクセスを一括でブロックする設定をしていますか？\n\n⚠ OpenAI・Googleなどのクローラーは米国IPから来るためブロックされます。",
    options: ["していない", "している", "わからない"],
    key: "overseas_ip",
    next: "noindex",
  },
  {
    id: "noindex",
    type: "select",
    category: "🤖 クローラー環境",
    question: "WordPressをお使いの場合：\n「設定 → 表示設定」で「検索エンジンにインデックスさせない」にチェックが入っていませんか？",
    options: ["入っていない（問題なし）", "入っている", "WordPress未使用", "わからない"],
    key: "noindex",
    next: "robots_url",
  },
  {
    id: "robots_url",
    type: "text",
    category: "🤖 クローラー環境",
    question: "御社サイトのURLを教えてください。\n弊社にてrobots.txtとnoindexの設定を確認します。",
    placeholder: "例：https://example.com",
    key: "site_url",
    next: "gsc",
  },

  // ── Googleアカウント ─────────────────────────────────────────────
  {
    id: "gsc",
    type: "select",
    category: "🔑 Googleアカウント",
    question: "Google Search Console にアクセスできますか？\n（サイトのインデックス状況を管理するGoogleのツールです）",
    options: ["アクセスできる（オーナー権限あり）", "アクセスできるが権限が低い", "設定していない・わからない"],
    key: "gsc",
    next: "gbp",
  },
  {
    id: "gbp",
    type: "select",
    category: "🔑 Googleアカウント",
    question: "Google Business Profile（Googleマップの会社ページ）を管理していますか？",
    options: ["管理している（オーナー権限あり）", "登録はあるが管理していない", "登録していない", "わからない"],
    key: "gbp",
    next: "ga",
  },
  {
    id: "ga",
    type: "select",
    category: "🔑 Googleアカウント",
    question: "Google Analytics は設置・確認できますか？",
    options: ["確認できる", "設置していない", "わからない"],
    key: "ga",
    next: "platforms",
  },

  // ── プラットフォーム ─────────────────────────────────────────────
  {
    id: "platforms",
    type: "multiselect",
    category: "📋 プラットフォーム棚卸し",
    question: "御社が利用しているSNS・プラットフォームをすべて選んでください。",
    options: ["Facebook", "Instagram", "X（旧Twitter）", "LinkedIn", "YouTube", "Indeed", "求人ボックス", "ハローワーク", "食べログ・Googleマップ等の口コミサイト", "業界ポータル・協会サイト"],
    key: "platforms",
    next: "old_accounts",
  },
  {
    id: "old_accounts",
    type: "select",
    category: "📋 プラットフォーム棚卸し",
    question: "使わなくなった古いSNS・サイト・求人媒体のアカウントが残っている可能性はありますか？",
    options: ["ない（把握できている）", "ある・あるかもしれない", "わからない"],
    key: "old_accounts",
    next: "profile",
  },

  // ── コンテンツ素材 ───────────────────────────────────────────────
  {
    id: "profile",
    type: "select",
    category: "📁 コンテンツ素材",
    question: "代表者のプロフィール（経歴・資格・顔写真）は整理されていますか？",
    options: ["すぐに用意できる", "一部あるが不完全", "ほぼない"],
    key: "profile",
    next: "achievements",
  },
  {
    id: "achievements",
    type: "select",
    category: "📁 コンテンツ素材",
    question: "会社の実績・受賞歴・メディア掲載歴はありますか？\n（URLつきのものが特に効果的です）",
    options: ["複数ある（URLも用意可）", "いくつかある", "ほぼない"],
    key: "achievements",
    next: "faq_material",
  },
  {
    id: "faq_material",
    type: "select",
    category: "📁 コンテンツ素材",
    question: "お客様や求職者からよくある質問・問い合わせ内容は把握していますか？",
    options: ["把握していてリスト化できる", "なんとなく把握している", "特に把握していない"],
    key: "faq_material",
    next: "memo",
  },

  // ── 自由記入 ────────────────────────────────────────────────────
  {
    id: "memo",
    type: "text",
    category: "📝 その他",
    question: "最後に、気になることや事前に伝えておきたいことがあれば自由に書いてください。\n（なければ「なし」でOKです）",
    placeholder: "例：サイトリニューアルを検討中です / Cloudflareの設定がよくわからないので教えてほしい",
    key: "memo",
    next: "done",
  },
];

// ── ユーティリティ ─────────────────────────────────────────────────────────
function getNext(step, answer) {
  if (typeof step.next === "function") return step.next(answer);
  return step.next;
}

function getStep(id) {
  return FLOW.find((s) => s.id === id);
}

function categoryColor(cat) {
  if (!cat) return "#1A3557";
  if (cat.includes("サイト")) return "#2563EB";
  if (cat.includes("クローラー")) return "#DC2626";
  if (cat.includes("Google")) return "#0D9488";
  if (cat.includes("プラット")) return "#EA580C";
  if (cat.includes("コンテンツ")) return "#7C3AED";
  return "#6B7280";
}

function answerLabel(key, value) {
  if (!value) return "—";
  if (Array.isArray(value)) return value.join("、");
  return value;
}

function needsAttention(key, value) {
  if (key === "cloudflare_botfight" && value === "オンになっている") return true;
  if (key === "overseas_ip" && value === "している") return true;
  if (key === "noindex" && value === "入っている") return true;
  if (key === "https" && value === "いいえ（http）") return true;
  return false;
}

function isUnknown(value) {
  if (!value) return false;
  if (Array.isArray(value)) return false;
  return value.includes("わからない") || value.includes("確認できない");
}

// ── コンポーネント ─────────────────────────────────────────────────────────
export default function GeoOnboarding() {
  const [currentId, setCurrentId] = useState("intro");
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [multiSelected, setMultiSelected] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [phase, setPhase] = useState("chat"); // "chat" | "done"
  const [isTyping, setIsTyping] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const bottomRef = useRef(null);

  const step = getStep(currentId);

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping, phase]);

  // 最初のメッセージを表示
  useEffect(() => {
    if (step?.type === "message") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages([{ type: "bot", text: step.text, id: step.id }]);
        setTimeout(() => {
          const next = getStep(step.next);
          if (next) setCurrentId(step.next);
        }, 600);
      }, 1000);
    }
  }, []);

  // currentIdが変わるたびに質問を追加
  useEffect(() => {
    const s = getStep(currentId);
    if (!s || s.type === "message" || s.id === "done") return;
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setVisibleMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: s.question,
          category: s.category,
          id: s.id,
          inputType: s.type,
          options: s.options,
          placeholder: s.placeholder,
        },
      ]);
      setMultiSelected([]);
      setTextInput("");
    }, 800);
  }, [currentId]);

  function handleSelect(option) {
    const s = getStep(currentId);
    if (!s) return;
    commitAnswer(s, option);
  }

  function handleMultiToggle(option) {
    setMultiSelected((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  function handleMultiSubmit() {
    const s = getStep(currentId);
    if (!s) return;
    const val = multiSelected.length > 0 ? multiSelected : ["なし"];
    commitAnswer(s, val);
  }

  function handleTextSubmit() {
    const s = getStep(currentId);
    if (!s) return;
    const val = textInput.trim() || "（記入なし）";
    commitAnswer(s, val);
  }

  function commitAnswer(s, value) {
    const newAnswers = { ...answers, [s.key]: value };
    setAnswers(newAnswers);

    // ユーザー発言を追加
    const displayVal = Array.isArray(value) ? value.join("、") : value;
    setVisibleMessages((prev) => [
      ...prev,
      { type: "user", text: displayVal, id: s.id + "_ans" },
    ]);

    const nextId = getNext(s, value);
    if (nextId === "done") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setPhase("done");
      }, 800);
    } else {
      setCurrentId(nextId);
    }
  }

  // サマリーテキスト生成（コピー用）
  function buildSummaryText(answers) {
    const lines = ["【GEO事前ヒアリング 回答サマリー】\n"];
    const keyLabels = {
      cms: "CMS",
      https: "HTTPS化",
      site_admin: "サイト管理者",
      cloudflare: "Cloudflare使用",
      cloudflare_botfight: "Bot Fight Mode",
      waf_other: "WAF・セキュリティプラグイン",
      overseas_ip: "海外IPブロック",
      noindex: "noindex設定（WordPress）",
      site_url: "サイトURL",
      gsc: "Search Console",
      gbp: "Google Business Profile",
      ga: "Google Analytics",
      platforms: "利用プラットフォーム",
      old_accounts: "休眠アカウント",
      profile: "代表者プロフィール",
      achievements: "実績・受賞歴",
      faq_material: "FAQ素材",
      memo: "備考",
    };
    for (const [key, label] of Object.entries(keyLabels)) {
      const val = answers[key];
      if (val !== undefined) {
        const display = Array.isArray(val) ? val.join("、") : val;
        const flag = needsAttention(key, val) ? " ⚠要対応" : isUnknown(val) ? " →弊社確認" : "";
        lines.push(`${label}：${display}${flag}`);
      }
    }
    return lines.join("\n");
  }

  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(buildSummaryText(answers)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // 最後の質問かどうか（入力UIを表示するか）
  const isLastActive = phase === "chat" && currentId !== "intro";
  const activeStep = getStep(currentId);
  const lastMsg = visibleMessages[visibleMessages.length - 1];
  const showInput = isLastActive && lastMsg?.type === "bot" && lastMsg?.id === currentId;

  // ── レンダリング ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2027 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      padding: "0 0 40px",
    }}>

      {/* ヘッダー */}
      <div style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "10px",
          background: "linear-gradient(135deg, #2563EB, #0D9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>🤖</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>
            GEO 事前ヒアリング
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Coa Retail / GEO Search Protocol</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["🖥", "🤖", "🔑", "📋", "📁"].map((icon, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: phase === "done" || Object.keys(answers).length > i * 3
                ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, transition: "background 0.3s",
            }}>{icon}</div>
          ))}
        </div>
      </div>

      {/* チャットエリア */}
      <div style={{
        width: "100%", maxWidth: 680,
        flex: 1,
        padding: "24px 16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>
        {visibleMessages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
            marginBottom: 12,
            animation: "fadeUp 0.3s ease",
          }}>
            {msg.type === "bot" && (
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #0D9488)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, marginRight: 10, flexShrink: 0, marginTop: 4,
              }}>🤖</div>
            )}
            <div style={{ maxWidth: "78%" }}>
              {msg.category && (
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  color: categoryColor(msg.category),
                  marginBottom: 5, marginLeft: 2,
                }}>{msg.category}</div>
              )}
              <div style={{
                background: msg.type === "user"
                  ? "linear-gradient(135deg, #2563EB, #1d4ed8)"
                  : "rgba(255,255,255,0.07)",
                border: msg.type === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: msg.type === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                padding: "12px 16px",
                color: "#f1f5f9",
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                backdropFilter: "blur(8px)",
              }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {/* タイピング中 */}
        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #2563EB, #0D9488)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>🤖</div>
            <div style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px 18px 18px 18px",
              padding: "12px 18px",
              display: "flex", gap: 5,
            }}>
              {[0, 1, 2].map((j) => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#64748b",
                  animation: `bounce 1.2s ${j * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* 入力UI */}
        {showInput && !isTyping && phase === "chat" && (
          <div style={{ marginTop: 8, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
            {activeStep?.type === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 42 }}>
                {activeStep.options.map((opt) => (
                  <button key={opt} onClick={() => handleSelect(opt)} style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "11px 18px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(37,99,235,0.25)";
                      e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {activeStep?.type === "multiselect" && (
              <div style={{ paddingLeft: 42 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {activeStep.options.map((opt) => (
                    <button key={opt} onClick={() => handleMultiToggle(opt)} style={{
                      background: multiSelected.includes(opt)
                        ? "rgba(37,99,235,0.35)" : "rgba(255,255,255,0.06)",
                      border: multiSelected.includes(opt)
                        ? "1px solid rgba(37,99,235,0.6)" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 20,
                      padding: "8px 14px",
                      color: multiSelected.includes(opt) ? "#93c5fd" : "#cbd5e1",
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}>
                      {multiSelected.includes(opt) ? "✓ " : ""}{opt}
                    </button>
                  ))}
                </div>
                <button onClick={handleMultiSubmit} style={{
                  background: "linear-gradient(135deg, #2563EB, #0D9488)",
                  border: "none", borderRadius: 12,
                  padding: "11px 24px",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {multiSelected.length > 0 ? `${multiSelected.length}件を選択して次へ →` : "該当なしで次へ →"}
                </button>
              </div>
            )}

            {activeStep?.type === "text" && (
              <div style={{ paddingLeft: 42, display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={activeStep.placeholder || ""}
                  rows={2}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#e2e8f0",
                    fontSize: 14,
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    outline: "none",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                />
                <button onClick={handleTextSubmit} style={{
                  alignSelf: "flex-start",
                  background: "linear-gradient(135deg, #2563EB, #0D9488)",
                  border: "none", borderRadius: 12,
                  padding: "10px 22px",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  次へ →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 完了画面 */}
        {phase === "done" && (
          <div style={{ animation: "fadeUp 0.4s ease", marginBottom: 24 }}>
            {/* 完了メッセージ */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #0D9488)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginTop: 4,
              }}>🤖</div>
              <div style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px 18px 18px 18px",
                padding: "14px 18px",
                color: "#f1f5f9", fontSize: 14, lineHeight: 1.7,
              }}>
                ありがとうございます！全項目の回答が完了しました 🎉<br />
                下の回答サマリーを弊社担当にそのままコピーして送っていただければOKです。<br /><br />
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>⚠ 要対応</span> の項目は弊社から個別にご連絡します。<br />
                <span style={{ color: "#94a3b8" }}>→ 弊社確認</span> の項目は弊社側で調査します。
              </div>
            </div>

            {/* サマリーカード */}
            <div style={{ paddingLeft: 42 }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                overflow: "hidden",
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #1A3557, #0f2027)",
                  padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                    📋 回答サマリー
                  </div>
                  <button onClick={handleCopy} style={{
                    background: copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8, padding: "6px 14px",
                    color: copied ? "#6ee7b7" : "#e2e8f0",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s", fontFamily: "inherit",
                  }}>
                    {copied ? "✓ コピー済み" : "コピーする"}
                  </button>
                </div>

                {/* 各回答行 */}
                {Object.entries({
                  cms: "CMS",
                  https: "HTTPS化",
                  site_admin: "サイト管理者",
                  cloudflare: "Cloudflare",
                  cloudflare_botfight: "Bot Fight Mode",
                  waf_other: "WAF・セキュリティ",
                  overseas_ip: "海外IPブロック",
                  noindex: "noindex設定",
                  site_url: "サイトURL",
                  gsc: "Search Console",
                  gbp: "Google Business Profile",
                  ga: "Google Analytics",
                  platforms: "利用プラットフォーム",
                  old_accounts: "休眠アカウント",
                  profile: "代表者プロフィール",
                  achievements: "実績・受賞歴",
                  faq_material: "FAQ素材",
                  memo: "備考",
                }).filter(([key]) => answers[key] !== undefined).map(([key, label], i) => {
                  const val = answers[key];
                  const display = Array.isArray(val) ? val.join("、") : val;
                  const warn = needsAttention(key, val);
                  const unk = isUnknown(val);
                  return (
                    <div key={key} style={{
                      padding: "10px 20px",
                      background: warn ? "rgba(220,38,38,0.08)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}>
                      <div style={{ color: "#64748b", fontSize: 12, width: 130, flexShrink: 0, paddingTop: 2 }}>{label}</div>
                      <div style={{ color: warn ? "#fca5a5" : unk ? "#94a3b8" : "#e2e8f0", fontSize: 13, flex: 1 }}>
                        {display}
                      </div>
                      {warn && <div style={{ color: "#f87171", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>⚠ 要対応</div>}
                      {!warn && unk && <div style={{ color: "#64748b", fontSize: 11, flexShrink: 0 }}>→ 弊社確認</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        button:active { transform: scale(0.97); }
        textarea::placeholder { color: #475569; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
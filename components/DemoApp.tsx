"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  BedDouble,
  Building2,
  Calendar,
  CalendarDays,
  Camera,
  CheckSquare,
  ClipboardCheck,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  History,
  Info,
  LayoutDashboard,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  Receipt,
  Reply,
  Send,
  Settings,
  Star,
  Tag,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wand2,
  X,
} from "lucide-react";
import type { DemoConfig, DemoPage } from "@/lib/demoConfigs";

const icons = {
  AlertTriangle,
  BarChart2,
  BedDouble,
  Building2,
  Calendar,
  CalendarDays,
  Camera,
  CheckSquare,
  ClipboardCheck,
  Eye,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Reply,
  Send,
  Settings,
  Star,
  Tag,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wand2,
} as const;

type Row = Record<string, string>;

export function DemoApp({ demo, activePath }: { demo: DemoConfig; activePath: string }) {
  const [navOpen, setNavOpen] = useState(false);
  const activePage = demo.pages.find((page) => page.path === activePath) ?? demo.pages[0];
  const homePath = `/${demo.id}`;

  return (
    <div className="sample-scope app-shell">
      <aside className={`sidebar ${navOpen ? "is-open" : ""}`}>
        <div className="brand-block">
          <Link href="/system-samples" className="back-link">
            <ArrowLeft size={18} />
            サンプル一覧
          </Link>
          <p className="demo-no">SAMPLE {demo.no}</p>
          <h1>{demo.fullName}</h1>
          <span>{demo.target}</span>
        </div>
        <nav className="side-nav">
          {demo.pages.map((page) => {
            const Icon = icons[page.icon as keyof typeof icons] ?? LayoutDashboard;
            const href = page.path === "/" ? homePath : `${homePath}${page.path}`;
            const active = page.path === activePage.path;
            return (
              <Link className={active ? "active" : ""} href={href} key={page.path} onClick={() => setNavOpen(false)}>
                <Icon size={19} />
                {page.label}
              </Link>
            );
          })}
        </nav>
        <div className="repo-note">
          <span>Sample</span>
          <code>画面レイアウト確認用</code>
          <small>入力・保存などの実処理は行われません</small>
        </div>
      </aside>

      <div className="mobile-top">
        <button type="button" onClick={() => setNavOpen(true)} aria-label="メニューを開く">
          <MenuIcon size={22} />
        </button>
        <strong>SAMPLE {demo.no}</strong>
        <span>{activePage.label}</span>
      </div>
      {navOpen && <button className="nav-scrim" onClick={() => setNavOpen(false)} aria-label="メニューを閉じる" type="button" />}

      <main className="content">
        <DemoBanner text={demo.banner} />
        <section className="page-head">
          <p className="eyebrow">{demo.shortName}</p>
          <h2>{activePage.title}</h2>
          <p>{activePage.description}</p>
        </section>
        <PageRenderer demo={demo} page={activePage} />
      </main>
    </div>
  );
}

function DemoBanner({ text }: { text: string }) {
  return (
    <div className="demo-banner">
      <Info size={18} />
      <span>{text}</span>
    </div>
  );
}

function PageRenderer({ demo, page }: { demo: DemoConfig; page: DemoPage }) {
  const storageKey = `shima:${demo.id}:${page.path}`;

  switch (page.kind) {
    case "dashboard":
      return <Dashboard page={page} />;
    case "table":
      return <TableView page={page} storageKey={`${storageKey}:rows`} />;
    case "cards":
      return <CardsView page={page} storageKey={`${storageKey}:cards`} />;
    case "calendar":
      return <CalendarView page={page} />;
    case "form":
      return <FormView page={page} storageKey={`${storageKey}:submissions`} />;
    case "about":
      return <AboutView page={page} />;
    case "floor":
      return <FloorView page={page} storageKey={`${storageKey}:tables`} />;
    case "menu":
      return <MenuPreview page={page} />;
    case "kanban":
      return <KanbanView page={page} />;
    case "report":
      return <ReportView page={page} />;
    case "invoice":
      return <InvoiceView page={page} />;
    case "qr":
      return <QrView demo={demo} page={page} />;
    case "ai":
      return <AiWriter />;
    default:
      return <Dashboard page={page} />;
  }
}

function Dashboard({ page }: { page: DemoPage }) {
  return (
    <div className="stack">
      <SummaryGrid summaries={page.summaries ?? []} />
      <div className="grid-two">
        <Card title="推移グラフ">
          <BarChart data={page.chart ?? []} />
        </Card>
        <Card title="確認リスト">
          <HighlightList items={page.highlights ?? []} />
        </Card>
      </div>
    </div>
  );
}

function SummaryGrid({ summaries }: { summaries: NonNullable<DemoPage["summaries"]> }) {
  return (
    <div className="summary-grid">
      {summaries.map((item) => (
        <div className={`summary-card tone-${item.tone ?? "muted"}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="muted">表示できるグラフデータがありません。</p>;
  return (
    <div className="bar-chart">
      {data.map((bar) => (
        <div className="bar-item" key={bar.label}>
          <div className="bar-track">
            <span style={{ height: `${Math.max(bar.value, 8)}%` }} />
          </div>
          <small>{bar.label}</small>
        </div>
      ))}
    </div>
  );
}

function HighlightList({ items }: { items: NonNullable<DemoPage["highlights"]> }) {
  return (
    <div className="highlight-list">
      {items.map((item) => (
        <button type="button" className={`highlight tone-${item.tone ?? "muted"}`} key={`${item.title}-${item.meta}`}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </span>
          {item.status && <em>{item.status}</em>}
        </button>
      ))}
    </div>
  );
}

function TableView({ page, storageKey }: { page: DemoPage; storageKey: string }) {
  const [rows] = useLocalRows(storageKey, page.rows ?? []);
  const [selected, setSelected] = useState<Row | null>(null);
  const columns = page.columns ?? [];

  return (
    <div className="stack">
      <SampleNotice />
      <div className="toolbar">
        <MockField label="検索" value="キーワード検索欄" />
        <div className="segmented">
          {(page.filters ?? ["全件", "確認中", "完了"]).map((filter) => (
            <button type="button" key={filter}>{filter}</button>
          ))}
        </div>
        <span className="mock-button">{page.cta ?? "追加"}（表示例）</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>アクション</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${Object.values(row).join("-")}-${index}`}>
                {columns.map((column) => <td key={column}>{row[column]}</td>)}
                <td>
                  <button className="small-btn" type="button" onClick={() => setSelected(row)}>詳細</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="side-panel">
          <button className="icon-btn" type="button" onClick={() => setSelected(null)} aria-label="閉じる"><X size={18} /></button>
          <h3>詳細</h3>
          <dl>
            {Object.entries(selected).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <MockField label="対応メモ" value="ここに対応メモや返信テンプレートが表示されます。" multiline />
        </div>
      )}
    </div>
  );
}

function CardsView({ page, storageKey }: { page: DemoPage; storageKey: string }) {
  const [cards] = useLocalState(storageKey, page.cards ?? []);
  return (
    <div className="stack">
      <SampleNotice />
      <div className="toolbar end">
        <span className="mock-button">{page.cta ?? "追加"}（表示例）</span>
      </div>
      <div className="card-grid">
        {cards.map((card, index) => (
          <article className="item-card" key={`${card.title}-${index}`}>
            <div>
              <h3>{card.title}</h3>
              <p>{card.meta}</p>
              {card.value && <strong>{card.value}</strong>}
            </div>
            {card.status && <span className={`status tone-${card.tone ?? "muted"}`}>{card.status}</span>}
            <div className="card-actions">
              <span>編集（表示例）</span>
              <span>状態変更（表示例）</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CalendarView({ page }: { page: DemoPage }) {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  const notes = page.highlights ?? [];
  const [selected, setSelected] = useState(notes[0] ?? null);

  return (
    <div className="grid-two align-start">
      <Card title="2026年6月">
        <div className="calendar-grid">
          {["月", "火", "水", "木", "金", "土", "日"].map((day) => <strong key={day}>{day}</strong>)}
          {days.map((day) => {
            const note = notes[day % notes.length];
            return (
              <button type="button" key={day} onClick={() => setSelected(note)}>
                <span>{day}</span>
                {day % 4 === 1 && <small>{note?.status ?? "1件"}</small>}
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="日付の詳細">
        {selected ? (
          <div className="detail-box">
            <h3>{selected.title}</h3>
            <p>{selected.meta}</p>
            {selected.status && <span className={`status tone-${selected.tone ?? "muted"}`}>{selected.status}</span>}
            {page.formFields && <FormFields fields={page.formFields} cta={page.cta ?? "保存"} compact />}
          </div>
        ) : (
          <p className="muted">日付を選択してください。</p>
        )}
      </Card>
    </div>
  );
}

function FormView({ page, storageKey }: { page: DemoPage; storageKey: string }) {
  const [records] = useLocalState<Record<string, string>[]>(storageKey, []);
  return (
    <div className="grid-two align-start">
      <Card title="入力項目">
        <SampleNotice />
        <FormFields
          fields={page.formFields ?? []}
          cta={page.cta ?? "保存"}
        />
      </Card>
      <Card title="確認">
        <div className="card-grid single">
          {(page.cards ?? []).map((card) => (
            <article className="item-card compact" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.meta}</p>
              {card.status && <span className={`status tone-${card.tone ?? "muted"}`}>{card.status}</span>}
            </article>
          ))}
        </div>
        {records.length > 0 && <p className="success">表示確認用のサンプル記録が{records.length}件あります。</p>}
      </Card>
    </div>
  );
}

function FormFields({
  fields,
  cta,
  compact,
}: {
  fields: string[];
  cta: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "form compact-form" : "form"}>
      {compact && <SampleNotice compact />}
      {fields.map((field) => (
        <MockField key={field} label={field} value={`${field}の表示枠`} multiline={field.includes("備考") || field.includes("コメント") || field.includes("キーワード")} />
      ))}
      <span className="mock-button">{cta}（表示例）</span>
    </div>
  );
}

function SampleNotice({ compact }: { compact?: boolean }) {
  return (
    <p className={compact ? "sample-notice compact" : "sample-notice"}>
      サンプルのため、画面レイアウトのみご確認ください
    </p>
  );
}

function MockField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="mock-field">
      <span>{label}</span>
      <p className={multiline ? "is-multiline" : ""}>{value}</p>
    </div>
  );
}

function AboutView({ page }: { page: DemoPage }) {
  const info = page.about;
  if (!info) return null;
  return (
    <div className="about-page">
      <section>
        <p className="eyebrow">CONCEPT</p>
        <h3>{info.catch}</h3>
      </section>
      <div className="grid-two">
        <Card title="よくある課題">
          <ul className="plain-list">{info.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        </Card>
        <Card title="このデモで見せる解決策">
          <ul className="plain-list check">{info.solutions.map((solution) => <li key={solution}>{solution}</li>)}</ul>
        </Card>
      </div>
      <div className="cta-band">
        <span>詳しい導入イメージやご相談はこちらから</span>
        <Link className="primary link-button" href={info.button ?? "https://shima-craft.com/#contact"}>相談ページへ</Link>
      </div>
    </div>
  );
}

function FloorView({ page, storageKey }: { page: DemoPage; storageKey: string }) {
  const [tables, setTables] = useLocalState(storageKey, [
    ["A", "空席", "2名"],
    ["B", "使用中", "4名"],
    ["C", "予約済み", "2名"],
    ["D", "清掃中", "6名"],
    ["E", "空席", "4名"],
    ["F", "予約済み", "4名"],
    ["G", "使用中", "2名"],
    ["H", "空席", "6名"],
  ]);
  const cycle = ["空席", "使用中", "予約済み", "清掃中"];
  return (
    <div className="stack">
      <SummaryGrid summaries={page.summaries ?? []} />
      <div className="floor-grid">
        {tables.map(([name, status, seats], index) => (
          <button
            className={`floor-table ${statusToClass(status)}`}
            key={name}
            type="button"
            onClick={() =>
              setTables(tables.map((table, tableIndex) => tableIndex === index ? [name, cycle[(cycle.indexOf(status) + 1) % cycle.length], seats] : table))
            }
          >
            <strong>テーブル{name}</strong>
            <span>{seats}</span>
            <em>{status}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function MenuPreview({ page }: { page: DemoPage }) {
  return (
    <div className="stack">
      <div className="notice-turquoise">このページはお客様向けHP上で表示されます。</div>
      <div className="segmented wide">
        {["コーヒー", "フード", "デザート", "セット"].map((tab) => <button type="button" key={tab}>{tab}</button>)}
      </div>
      <div className="menu-grid">
        {(page.cards ?? []).map((item) => (
          <article className="menu-card" key={item.title}>
            <div className="menu-thumb" />
            <div>
              <span>{item.status}</span>
              <h3>{item.title}</h3>
              <p>{item.meta}</p>
              <strong>{item.value}</strong>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function KanbanView({ page }: { page: DemoPage }) {
  const items = page.rows ?? [];
  const groups = ["未着手", "作業中", "完了"];
  return (
    <div className="kanban">
      {groups.map((group) => (
        <section key={group}>
          <h3>{group}</h3>
          {items.filter((item, index) => (item["ステータス"] ?? groups[index % 3]) === group).map((item, index) => (
            <article className="kanban-card" key={`${group}-${index}`}>
              <strong>{item["タスク名"] ?? item["案件名"] ?? item["タスク名"] ?? "タスク"}</strong>
              <span>{item["担当者"] ?? item["案件名"] ?? "担当未設定"}</span>
              <em>{item["優先度"] ?? "中"}</em>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function ReportView({ page }: { page: DemoPage }) {
  return (
    <div className="grid-two align-start">
      <Card title="報告書条件">
        <SampleNotice />
        <FormFields fields={page.formFields ?? []} cta={page.cta ?? "印刷"} />
      </Card>
      <div className="report-preview">
        <h3>施工写真報告書</h3>
        <p>案件名: 外壁リフォーム / 作成日: 2026年6月29日</p>
        {["着工前写真", "工事中写真", "完工後写真"].map((phase) => (
          <section key={phase}>
            <h4>{phase}</h4>
            <div className="photo-grid">
              <div />
              <div />
            </div>
            <small>コメント付きで写真を自動整理します。</small>
          </section>
        ))}
        <span className="mock-button">PDFとして保存（表示例）</span>
      </div>
    </div>
  );
}

function InvoiceView({ page }: { page: DemoPage }) {
  return (
    <div className="stack">
      <TableView page={page} storageKey={`shima:invoice:${page.path}:rows`} />
      <Card title="見積プレビュー">
        <div className="invoice-preview">
          <h3>御見積書</h3>
          <p>小計 180,000円 / 消費税 18,000円 / 税込合計 198,000円</p>
          <span className="mock-button">プレビュー・印刷（表示例）</span>
        </div>
      </Card>
    </div>
  );
}

function QrView({ demo, page }: { demo: DemoConfig; page: DemoPage }) {
  const [url, setUrl] = useState(`/${demo.id}/form`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/${demo.id}/form`);
  }, [demo.id]);

  return (
    <div className="grid-two align-start">
      <Card title="フォームURL">
        <div className="qr-box">
          <QRCodeCanvas value={url} size={168} level="M" />
          <code>{url}</code>
          <button
            className="primary"
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(url);
              setCopied(true);
            }}
          >
            <Copy size={17} />
            コピー
          </button>
          {copied && <p className="success">コピーしました。</p>}
        </div>
      </Card>
      <CardsView page={page} storageKey={`shima:${demo.id}:${page.path}:cards`} />
    </div>
  );
}

function AiWriter() {
  return (
    <div className="grid-two align-start">
      <Card title="入力項目">
        <SampleNotice />
        <div className="form">
          <MockField label="生成タイプ" value="Instagram投稿文" />
          <MockField label="業種" value="カフェ" />
          <MockField label="内容・キーワード" value="夏のキャンペーン / 20%オフ / 8月末まで" multiline />
          <MockField label="トーン" value="親しみやすい" />
          <MockField label="追加指示" value="ハッシュタグを含める等" />
          <span className="mock-button">AIに生成してもらう（表示例）</span>
        </div>
      </Card>
      <Card title="生成結果">
        <div className="result-box">
          <p>夏限定キャンペーンのお知らせです。8月末まで対象メニューを20%オフでご利用いただけます。ご来店をお待ちしています。</p>
          <small>生成結果の表示例</small>
          <div className="card-actions">
            <span>コピー（表示例）</span>
            <span>再生成（表示例）</span>
            <span>保存（表示例）</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function statusToClass(status: string) {
  if (status.includes("空席")) return "is-free";
  if (status.includes("使用中")) return "is-busy";
  if (status.includes("予約")) return "is-reserved";
  return "is-cleaning";
}

function useLocalRows(key: string, initialRows: Row[]) {
  return useLocalState<Row[]>(key, initialRows);
}

function useLocalState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
      else {
        setValue(initialValueRef.current);
        localStorage.setItem(key, JSON.stringify(initialValueRef.current));
      }
    } catch {
      /* localStorage が使えない場合は初期データを使う */
    }
  }, [key]);
  const update = useMemo(() => {
    return (nextValue: T) => {
      setValue(nextValue);
      try {
        localStorage.setItem(key, JSON.stringify(nextValue));
      } catch {
        /* localStorage が使えない場合は画面内だけ更新 */
      }
    };
  }, [key]);
  return [value, update] as const;
}

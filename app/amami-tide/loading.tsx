import styles from "./amami-tide.module.css";

export default function Loading() {
  return <main className={styles.loadingPage}><div className={styles.loadingWave}/><p>奄美の潮と空を読み込んでいます…</p></main>;
}

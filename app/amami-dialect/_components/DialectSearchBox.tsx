"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
};

export function DialectSearchBox({
  value,
  onChange,
  onSubmit,
  id = "dialect-search-box-input",
  label = "標準語・方言・島名から検索",
  placeholder = "例：喜界島 おはよう",
}: Props) {
  return (
    <form
      className="dialect-search-box"
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <label htmlFor={id} className="dialect-search-box-label">
        {label}
      </label>
      <div className="dialect-search-box-row">
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="submit" className="btn">
          検索
        </button>
      </div>
    </form>
  );
}

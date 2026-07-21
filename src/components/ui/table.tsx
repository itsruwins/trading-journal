import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

export function Table({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse text-left text-[14px] ${className}`}
        {...props}
      />
    </div>
  );
}

export function THead({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TBody({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TR({
  interactive = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={`border-b border-edge last:border-b-0 ${
        interactive
          ? "cursor-pointer transition-colors duration-150 ease-out hover:bg-raised/60"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export function TH({
  numeric = false,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`h-10 whitespace-nowrap px-3 text-[13px] font-medium text-muted first:pl-5 last:pr-5 ${
        numeric ? "text-right" : ""
      } ${className}`}
      {...props}
    />
  );
}

export function TD({
  numeric = false,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={`h-12 whitespace-nowrap px-3 text-ink first:pl-5 last:pr-5 ${
        numeric ? "tabular text-right" : ""
      } ${className}`}
      {...props}
    />
  );
}

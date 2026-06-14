import { lazy, Suspense, type ReactNode } from 'react';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import styles from './style/job-notes-tab.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

const ReactMarkdown = lazy(() => import('react-markdown'));

const customSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'dl',
    'dt',
    'dd',
    'em',
    'strong',
    'sub',
    'sup',
    'mark',
    'del',
    'ins',
  ],
  attributes: {
    ...defaultSchema.attributes,
    table: ['className'],
    thead: ['className'],
    tbody: ['className'],
    tr: ['className'],
    th: ['className', 'align', 'scope', 'colSpan', 'rowSpan'],
    td: ['className', 'align', 'colSpan', 'rowSpan'],
    dl: ['className'],
    dt: ['className'],
    dd: ['className'],
  },
};

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.mdH4}>{children}</h4>,
  h5: ({ children }) => <h5 className={styles.mdH5}>{children}</h5>,
  h6: ({ children }) => <h6 className={styles.mdH6}>{children}</h6>,
  p: ({ children }) => <p className={styles.mdParagraph}>{children}</p>,
  ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
  li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
  blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
  code: ({ className, children }) => {
    const isInline = !className;
    return isInline ? (
      <code className={styles.mdInlineCode}>{children}</code>
    ) : (
      <code className={styles.mdCodeBlock}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre
      className={`${styles.mdPre} ${scrollStyles.scrollbarVerticalThinContainer} ${scrollStyles.scrollbarHorizontalThinContainer}`}
    >
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a href={href} className={styles.mdLink} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className={styles.mdTableWrapper}>
      <table className={styles.mdTable}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={styles.mdThead}>{children}</thead>,
  tbody: ({ children }) => <tbody className={styles.mdTbody}>{children}</tbody>,
  tr: ({ children }) => <tr className={styles.mdTr}>{children}</tr>,
  th: ({ children }) => <th className={styles.mdTh}>{children}</th>,
  td: ({ children }) => <td className={styles.mdTd}>{children}</td>,
  dl: ({ children }) => <dl className={styles.mdDl}>{children}</dl>,
  dt: ({ children }) => <dt className={styles.mdDt}>{children}</dt>,
  dd: ({ children }) => <dd className={styles.mdDd}>{children}</dd>,
  em: ({ children }) => <em className={styles.mdEm}>{children}</em>,
  strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
  hr: () => <hr className={styles.mdHr} />,
};

export function MarkdownLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>Loading markdown...</div>
    </div>
  );
}

interface MarkdownProps {
  source: string;
  fallback?: ReactNode;
}

export function Markdown({ source, fallback = <MarkdownLoading /> }: MarkdownProps) {
  return (
    <Suspense fallback={fallback}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema]]}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </Suspense>
  );
}

export default Markdown;

'use client'

import type { AnchorHTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './AssistantMarkdown.module.css'

function MarkdownLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}

const components = { a: MarkdownLink }

type AssistantMarkdownProps = {
  children: string
  className?: string
}

/** Renders assistant / model text as GitHub-flavored markdown (lists, bold, links, tables, code). */
export function AssistantMarkdown({ children, className }: AssistantMarkdownProps) {
  return (
    <div className={`${styles.root} ${className ?? ''}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

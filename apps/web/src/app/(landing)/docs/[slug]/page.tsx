import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";

// Dynamic routing for all document slugs
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Resolve the markdown file path
  const filePath = path.join(process.cwd(), "public", "docs", `${slug}.md`);

  // Verify file exists
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  // Read content
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="docs-content animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Use our design system's heading styles
          h1: ({ children }) => <h1 className="text-4xl font-bold tracking-tight mb-8">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-semibold tracking-tight mt-12 mb-6 border-b border-border pb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-semibold tracking-tight mt-8 mb-4">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed text-muted-foreground mb-6">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="pl-2">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className?.includes("language-");
            return isInline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono text-foreground">{children}</code>
            ) : (
              <code className="block w-full overflow-x-auto font-mono text-sm leading-6 py-4 px-1">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-8 overflow-hidden rounded-xl border border-border bg-muted/50 p-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent bg-accent/5 px-6 py-4 rounded-r-xl italic my-8">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-8 w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm border border-border rounded-xl">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted/50 px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-4 py-3 text-muted-foreground">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Optional: Generate static paths for better performance
export async function generateStaticParams() {
  const docsDirectory = path.join(process.cwd(), "public", "docs");
  const files = fs.readdirSync(docsDirectory);
  
  return files
    .filter(file => file.endsWith(".md"))
    .map(file => ({
      slug: file.replace(".md", ""),
    }));
}

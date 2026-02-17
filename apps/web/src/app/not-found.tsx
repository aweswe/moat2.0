export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <h1 className="text-4xl font-bold mb-4 font-mono uppercase tracking-tighter">404: Trace_Not_Found</h1>
            <p className="text-muted-foreground mb-8 font-mono text-sm">The execution path you requested does not exist in the current runtime context.</p>
            <a href="/" className="text-brand hover:underline font-mono text-xs">Return_to_Source</a>
        </div>
    );
}

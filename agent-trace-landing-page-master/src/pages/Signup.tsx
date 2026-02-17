
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Signup() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
                    <p className="text-muted-foreground">Start tracing your agents in seconds.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-4">
                    <div className="grid gap-2">
                        <input type="email" placeholder="name@company.com" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                        <Button className="w-full">Sign up with Email</Button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => window.open('https://github.com', '_blank')}>
                        GitHub
                    </Button>
                </div>

                <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Landing
                </Link>
            </div>
        </div>
    );
}

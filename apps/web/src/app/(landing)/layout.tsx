import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

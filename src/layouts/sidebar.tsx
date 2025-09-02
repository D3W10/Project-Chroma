import { Navbar } from "../components/Navbar";

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen flex flex-col">
            <div className="h-screen flex">
                <Navbar />
                <div className="flex flex-col flex-1">
                    <header className="flex justify-between items-center p-4">
                    </header>
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
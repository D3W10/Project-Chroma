import { NavLink } from "react-router";
import PhotosIcon from "./icons/Image24Regular";
import PhotosIconSelected from "./icons/Image24Filled";
import AlbumIcon from "./icons/Album24Regular";
import AlbumIconSelected from "./icons/Album24Filled";

function NavbarItem({ to, icon }: { to: string, icon: (isActive: boolean) => React.ReactNode }) {
    return (
        <NavLink
            to={to}
            className={
                ({ isActive }) => `h-16 flex! justify-center items-center text-white ${!isActive ? "bg-blue-800" : "bg-blue-700"} rounded-md`
            }
        >
            {({ isActive }) => icon(isActive)}
        </NavLink>
    );
};

export function Navbar() {
    return (
        <nav className="w-24 p-1.5 bg-blue-950 space-y-1.5">
            <NavbarItem to="/" icon={isActive => !isActive ? <PhotosIcon /> : <PhotosIconSelected />} />
            <NavbarItem to="/albums" icon={isActive => !isActive ? <AlbumIcon /> : <AlbumIconSelected />} />
        </nav>
    );
}
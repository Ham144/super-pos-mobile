import React from "react";
import {
  Download,
  LayoutDashboard,
  LogIn,
  Newspaper,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useUserInfo } from "@/store";
import { logout } from "@/api/authApi";

const MenuNavigation = () => {
  const navigate = useNavigate();
  const { userInfo, clearUserInfo } = useUserInfo();

  const handleLogout = async () => {
    clearUserInfo();
    await logout();
  };

  //menu navigation responsive sudah perfect
  return (
    <div className="fixed  xl:w-[70vw] xl:left-[22vw] top-3 max-md:left-2 max-md:right-2 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="navbar bg-white backdrop-blur-sm rounded-xl shadow-md">
          <div className="navbar-start px-3">
            <div className="relative flex justify-center items-center ">
              <img
                src="./logo.png"
                alt="CSI SUPER POS Logo"
                width={50}
                height={50}
                className="rounded-2xl shadow-lg object-contain"
              />
            </div>
          </div>

          {/* Menu Tengah */}
          <div className="navbar-center hidden md:flex">
            <button
              name="go to dashboard"
              onClick={() => navigate("/dashboard")}
              className="btn btn-ghost rounded-btn"
            >
              <LayoutDashboard className="h-5 w-5 mr-1" /> Dashboard
            </button>
            <button
              name="go to artikel documentation"
              onClick={() => navigate("/artikel_documentation")}
              className="btn btn-ghost rounded-btn"
            >
              <Newspaper className="h-5 w-5 mr-1" />
              Artikel Dokumentasi
            </button>
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                name="go to download"
                className="btn items-center btn-ghost rounded-btn"
              >
                <Download className="h-5 w-5 mr-1" /> Download
              </label>
              <ul
                tabIndex={0}
                name="go to download"
                className="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 mt-4"
              >
                <li>
                  <button
                    onClick={() => {
                      navigate("/downloads/apk");
                    }}
                    className="btn btn-ghost w-full"
                  >
                    Android
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="navbar-end">
            <div className="dropdown dropdown-end md:hidden">
              <label tabIndex={0} className="btn btn-ghost">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <button onClick={() => navigate("/")}>Home</button>
                </li>
                <li>
                  <button onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/artikel_documentation")}>
                    Dokumentasi
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/downloads/apk")}>
                    Download
                  </button>
                </li>
              </ul>
            </div>

            {/* User Info */}
            {userInfo ? (
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost rounded-btn">
                  <UserRound className="h-5 w-5 mr-1" /> {userInfo?.username}
                </label>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 mt-4"
                >
                  <li>
                    <button
                      onClick={() => navigate("/profile")}
                      className="btn btn-ghost w-full"
                    >
                      Profile
                    </button>
                  </li>
                  <li>
                    <button className="btn btn-ghost w-full">
                      Change Password
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleLogout()}
                      className="btn btn-ghost w-full"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="btn btn-ghost rounded-btn"
              >
                <LogIn className="h-5 w-5 mr-1" /> Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuNavigation;

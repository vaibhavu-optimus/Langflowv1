import {
  LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS,
  LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS_ENV,
} from "@/constants/constants";
import { useRefreshAccessToken } from "@/controllers/API/queries/auth";
import { CustomNavigate } from "@/customization/components/custom-navigate";
import useAuthStore from "@/stores/authStore";
import { useEffect } from "react";

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { mutate: mutateRefresh } = useRefreshAccessToken();

  useEffect(() => {
    const envRefreshTime = LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS_ENV;
    const automaticRefreshTime = LANGFLOW_ACCESS_TOKEN_EXPIRE_SECONDS;

    const accessTokenTimer = isNaN(envRefreshTime)
      ? automaticRefreshTime
      : envRefreshTime;

    const intervalFunction = () => {
      mutateRefresh();
    };

    if (isAuthenticated) {
      const intervalId = setInterval(intervalFunction, accessTokenTimer * 1000);
      intervalFunction();
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);
  console.log("User Authenticated:", isAuthenticated);

  if (!isAuthenticated) {
    const currentPath = window.location.pathname;
    const isHomePath = currentPath === "/" || currentPath === "/flows";
    const isLoginPage = location.pathname.includes("login");

    return (
      <CustomNavigate
        to={
          "/login" +
          (!isHomePath && !isLoginPage ? "?redirect=" + currentPath : "")
        }
        replace
      />
    );
  } else {
    return children;
  }
};

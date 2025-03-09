import LangflowLogo from "@/assets/LLMControlLogo.svg?react";
import { useLoginUser } from "@/controllers/API/queries/auth";
import { CustomLink } from "@/customization/components/custom-link";
import { ENABLE_NEW_LOGO } from "@/customization/feature-flags";
import * as Form from "@radix-ui/react-form";
import { useContext, useState, useEffect } from "react";
import InputComponent from "../../components/core/parameterRenderComponent/components/inputComponent";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { SIGNIN_ERROR_ALERT } from "../../constants/alerts_constants";
import { CONTROL_LOGIN_STATE } from "../../constants/constants";
import { AuthContext } from "../../contexts/authContext";
import useAlertStore from "../../stores/alertStore";
import { LoginType } from "../../types/api";
import {
  inputHandlerEventType,
  loginInputStateType,
} from "../../types/components";
import { GoogleIcon } from "../../icons/Google";

const GOOGLE_CLIENT_ID = "934259990126-meh595u3nna778ngpd9ceck0mjjuepk6.apps.googleusercontent.com"
const REDIRECT_URI = window.location.origin + "/google-auth-callback";

function googleSignIn() {
  const oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

  const params = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",  // Getting token directly (Implicit Flow)
    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    include_granted_scopes: "true",
    state: "pass-through-value",
  };

  // Redirect to Google OAuth
  const url = `${oauth2Endpoint}?${new URLSearchParams(params).toString()}`;
  window.location.href = url;
}


export default function LoginPage(): JSX.Element {
  const [inputState, setInputState] =
    useState<loginInputStateType>(CONTROL_LOGIN_STATE);

  const { password, username } = inputState;
  const { login } = useContext(AuthContext);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get("access_token");
  
      if (accessToken) {
        // Fetch user info from Google
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((user) => {
            console.log("Google User:", user);
            login(accessToken, "google");
            window.location.href = "/";
          })
          .catch((err) => console.error("Google Sign-In Error:", err));
      }
    }
  }, [login]);
  

  function handleInput({
    target: { name, value },
  }: inputHandlerEventType): void {
    setInputState((prev) => ({ ...prev, [name]: value }));
  }

  const { mutate } = useLoginUser();

  function signIn() {
    const user: LoginType = {
      username: username.trim(),
      password: password.trim(),
    };

    mutate(user, {
      onSuccess: (data) => {
        login(data.access_token, "login", data.refresh_token);
        window.location.href = "/";
      },
      onError: (error) => {
        setErrorData({
          title: SIGNIN_ERROR_ALERT,
          list: [error["response"]["data"]["detail"]],
        });
      },
    });
  }

  return (
    <Form.Root
      onSubmit={(event) => {
        if (password === "") {
          event.preventDefault();
          return;
        }
        signIn();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        event.preventDefault();
      }}
      className="h-screen w-full"
    >
      <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
        <div className="flex w-72 flex-col items-center justify-center gap-2">
          {ENABLE_NEW_LOGO ? (
            <LangflowLogo
              title="Langflow logo"
              className="mb-4 h-10 w-10 scale-[1.5]"
            />
          ) : (
            <span className="mb-4 text-5xl">⛓</span>
          )}
          <span className="mb-6 text-2xl font-semibold text-primary">
            Sign in to LLM Control
          </span>
          <div className="mb-3 w-full">
            <Form.Field name="username">
              <Form.Label className="data-[invalid]:label-invalid">
                Username <span className="font-medium text-destructive">*</span>
              </Form.Label>

              <Form.Control asChild>
                <Input
                  type="username"
                  onChange={({ target: { value } }) => {
                    handleInput({ target: { name: "username", value } });
                  }}
                  value={username}
                  className="w-full"
                  required
                  placeholder="Username"
                />
              </Form.Control>

              <Form.Message match="valueMissing" className="field-invalid">
                Please enter your username
              </Form.Message>
            </Form.Field>
          </div>
          <div className="mb-3 w-full">
            <Form.Field name="password">
              <Form.Label className="data-[invalid]:label-invalid">
                Password <span className="font-medium text-destructive">*</span>
              </Form.Label>

              <InputComponent
                onChange={(value) => {
                  handleInput({ target: { name: "password", value } });
                }}
                value={password}
                isForm
                password={true}
                required
                placeholder="Password"
                className="w-full"
              />

              <Form.Message className="field-invalid" match="valueMissing">
                Please enter your password
              </Form.Message>
            </Form.Field>
          </div>
          <div className="w-full">
            <Form.Submit asChild>
              <Button className="mr-3 mt-6 w-full" type="submit">
                Sign in
              </Button>
            </Form.Submit>
          </div>
          <div className="flex items-center my-4">
            <div className="flex-grow h-px bg-muted-foreground/20"></div>
            <span className="px-3 text-xs text-muted-foreground">OR</span>
            <div className="flex-grow h-px bg-muted-foreground/20"></div>
          </div>
          <div className="w-full">
            <Button 
              className="w-full flex items-center justify-center gap-2" 
              variant="outline" 
              type="button"
              onClick={googleSignIn}
            >
              <GoogleIcon />
              <span>Sign in with Google</span>
            </Button>
          </div>
          <div className="w-full">
            <CustomLink to="/signup">
              <Button className="w-full" variant="outline" type="button">
                Don't have an account?&nbsp;<b>Sign Up</b>
              </Button>
            </CustomLink>
          </div>
        </div>
      </div>
    </Form.Root>
  );
}
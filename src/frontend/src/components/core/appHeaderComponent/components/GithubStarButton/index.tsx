import ShadTooltip from "@/components/common/shadTooltipComponent";
import { useDarkStore } from "@/stores/darkStore";
import { FaGithub } from "react-icons/fa";

export const GithubStarComponent = () => {
  const stars: number | undefined = useDarkStore((state) => state.stars);

  return (
    <ShadTooltip content="Go to Github repo" side="bottom" styleClasses="z-10">
      <div className="group inline-flex h-8 items-center justify-center gap-1 rounded-md border bg-muted px-2 pr-2 hover:border-input hover:bg-secondary-hover">
        <FaGithub className="h-4 w-4" />
      </div>
    </ShadTooltip>
  );
};

export default GithubStarComponent;

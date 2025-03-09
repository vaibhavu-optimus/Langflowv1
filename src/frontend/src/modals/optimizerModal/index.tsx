import { useEffect } from "react";
import BaseModal from "../baseModal";
import SimpleFlowEditor from "../../pages/optimizer/components/flow/FlowEditor";

/**
 * Modal component for the Optimizer functionality
 */
export default function OptimizerModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  return (
    <BaseModal
      open={open}
      setOpen={setOpen}
      size="large-h-full" // Using a full-height size for better visibility
    >
      <BaseModal.Header description="Optimize your LLM Chain">
        LLMC Optimizer
      </BaseModal.Header>
      <BaseModal.Content>
        <div className="h-[600px] w-full">
          <SimpleFlowEditor />
        </div>
      </BaseModal.Content>
    </BaseModal>
  );
} 
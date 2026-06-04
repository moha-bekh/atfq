import { useState } from "react";

const DEMO_NOTICE_SESSION_KEY = "atfq-demo-notice-seen";

export function DemoNotice() {
  const [isOpen, setIsOpen] = useState(
    () => window.sessionStorage.getItem(DEMO_NOTICE_SESSION_KEY) !== "true",
  );

  const closeNotice = () => {
    window.sessionStorage.setItem(DEMO_NOTICE_SESSION_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 px-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-notice-title"
    >
      <div className="w-full max-w-md rounded-lg border border-main/25 bg-bg p-6 text-text shadow-2xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sub">
              Demo / POC
            </p>
            <h2
              id="demo-notice-title"
              className="mt-2 font-display text-2xl font-semibold leading-tight text-main"
            >
              ATFQ is a public demo.
            </h2>
          </div>

          <p className="text-sm leading-6 text-text">
            This deployment is a proof of concept used to showcase the project.
            Features and data may be reset, changed, or temporarily unavailable.
          </p>

          <button
            type="button"
            className="mt-1 flex min-h-[42px] items-center justify-center rounded-lg border-2 border-sub bg-sub px-5 py-2 text-sm font-bold text-text transition-all hover:border-text hover:bg-transparent"
            onClick={closeNotice}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

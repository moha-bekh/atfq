import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-230px)] w-full max-w-7xl items-center justify-center px-6 py-12 text-center sm:px-16 lg:px-24">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <p className="font-display text-[96px] font-semibold leading-none text-error sm:text-[144px] lg:text-[190px]">
            404
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-main sm:text-3xl lg:text-4xl">
            This page does not exist.
          </h1>
          <div className="h-0.5 w-full max-w-2xl bg-main" />
          <p className="max-w-xl text-base leading-7 text-text">
            The link may be outdated, the page may have moved, or the concept is
            still waiting to be written.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <Button to="/wiki?page=getting-started" variant="primary" className="px-5">
            Explore the wiki
          </Button>
          <Button to="/" variant="outline" className="px-5">
            Back home
          </Button>
        </div>
      </div>
    </section>
  );
}

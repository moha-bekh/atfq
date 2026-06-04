import { Button } from '@/components/ui/Button';
import { CONTACT_MAILTO } from '@/config/contact';

export function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-230px)] w-full max-w-7xl items-center px-6 py-10 sm:px-16 lg:px-24 lg:py-0">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="max-w-3xl">
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.05] text-main sm:text-5xl lg:text-[64px]">
            Let curiosity be your compass.
          </h1>

          <div className="my-6 h-0.5 w-full max-w-2xl bg-main" />

          <div className="max-w-[420px]">
            <div className="flex flex-col gap-6">
              <p className="text-base leading-7 text-text">
                ATFQ is an open-source knowledge graph for deep computer science.
                Beyond syntax and tools, explore the cascade of whys and learn to
                think like an engineer.
              </p>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <Button to="/wiki?page=getting-started" variant="primary" className="px-5">
                  Explore
                </Button>
                <Button to="/wiki?page=contribute" variant="outline" className="px-5">
                  Contribute
                </Button>
              </div>

              <a
                href={CONTACT_MAILTO}
                className="group w-fit text-base text-main transition-colors hover:text-text"
              >
                Contact us
                <span className="mt-1 block h-[1.5px] w-0 bg-main transition-all group-hover:w-full" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

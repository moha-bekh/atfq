import { Button } from '@/components/ui/Button';

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      {/* Badge subtil */}
      <span className="text-[10px] uppercase tracking-[0.3em] text-main mb-4 px-3 py-1 border border-main/20 rounded-full bg-main/5">
        Computer Sccience Wiki / RoadMap
      </span>

      {/* Hero Section */}
      <h1 className="font-display text-5xl md:text-7xl font-bold text-text tracking-tight mb-6">
        {/* Stop searching.<br /> */}
        <span className="text-main italic">Let curiosity<br />be your compass.</span>
      </h1>

      <p className="max-w-xl text-sub text-lg mb-10 leading-relaxed">
        The no-bullshit wiki for Computer Science. Learn the concepts,
        then <span className="text-text font-mono">TTFC</span> (Type The Fucking Command)
        to build muscle memory.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
        <Button to="/wiki" variant="primary" className="w-full sm:w-auto text-center">ATFQ</Button>
        {/* <Button to="/ttfc" variant="outline" className="w-full sm:w-auto text-center">TTFC</Button> */}
      </div>

      {/* Stats / Proof Line */}
      <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
        <div className="flex flex-col">
          <span className="font-mono text-2xl text-text">1.4m</span>
          <span className="text-[10px] uppercase tracking-widest">Users</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-2xl text-text">1.2k</span>
          <span className="text-[10px] uppercase tracking-widest">Questions</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-2xl text-text">850</span>
          <span className="text-[10px] uppercase tracking-widest">Commands</span>
        </div>
      </div>
    </div>
  );
}

"use client";

// A decorative thread divider that draws in once, the first time it is 30% in view.
// The wrapper is observed, not the image: the image starts fully clipped and would never report as visible.
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import "./landing.css";

export function ThreadReveal({ src, width, height, className }: { src: string; width: number; height: number; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      // Old browsers without IntersectionObserver show the thread straight away.
      queueMicrotask(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        className={`tdiv reveal ${className} ${shown ? "in" : ""}`}
      />
    </div>
  );
}

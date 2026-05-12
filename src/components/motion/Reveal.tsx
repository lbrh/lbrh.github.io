import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variant,
} from "framer-motion";
import type { ReactNode } from "react";

export type RevealDirection = "up" | "down" | "left" | "right";

const offset = 56;

export function hiddenForDirection(direction: RevealDirection): Variant {
  switch (direction) {
    case "left":
      return { opacity: 0, x: -offset };
    case "right":
      return { opacity: 0, x: offset };
    case "down":
      return { opacity: 0, y: -offset };
    default:
      return { opacity: 0, y: offset };
  }
}

const visible: Variant = { opacity: 1, x: 0, y: 0 };

type RevealProps = {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "whileInView" | "viewport">;

export function Reveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  ...motionProps
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px", amount: 0.2 }}
      variants={{
        hidden: hiddenForDirection(direction),
        visible: {
          ...visible,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
        },
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

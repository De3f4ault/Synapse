import { motion } from "framer-motion";

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="text-zinc-400 text-sm font-medium mr-1">Thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
            animate={{
              y: ["0%", "-50%", "0%"],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}

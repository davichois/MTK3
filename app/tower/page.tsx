"use client";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";
import type { Corredor } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export const runtime = "edge";

export default function TowerPosition() {
  const [positions, setPositions] = useState<Corredor[]>([]);

  useEffect(() => {
    socket.on("update_positions", (newPositions) => {
      setPositions(newPositions);
      console.log("Posiciones actualizadas recibidas:", newPositions);
    });

    return () => {
      socket.off("update_positions");
    };
  }, []);

  return (
    <div className="bg-[#32ff00] flex items-center justify-center min-h-screen flex-col p-4">
      <AnimatePresence>
        {positions.map((item, index) => (
          <motion.div
            key={item.numero} // Usamos un identificador único
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            layout
            className="flex items-center text-white font-bold bg-black overflow-hidden shadow"
          >
            {/* Caja blanca con número */}
            <div className="bg-black text-white w-12 h-10 flex items-center justify-center">
              {item.posicion}
            </div>

            {/* Texto central */}
            <div className="bg-black text-white w-40 h-10 flex items-center justify-start px-2 overflow-hidden whitespace-nowrap">
              <span className="truncate px-2 font-medium">
                {item.equipo.charAt(0)}
              </span>
              <span className="truncate font-black">
                {item.equipo.split(" ")[1]}
              </span>
            </div>

            {/* Caja roja con score */}
            <div className="bg-red-600 text-white w-12 h-7 flex items-center justify-center px-2 overflow-hidden whitespace-nowrap rounded-l-md">
              <span className="truncate">{item.numero}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

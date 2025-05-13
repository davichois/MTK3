"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import {
  Trophy,
  GripVertical,
  Flag,
  Trash2,
  Edit2,
  Save,
  X,
  Search,
} from "lucide-react";
import type { Corredor } from "@/lib/types";
import { socket } from "@/lib/socketClient";

type FiltroCorredores = "todos" | "activos" | "inactivos";

export const runtime = "edge";

export default function SistemaCorredores() {
  // Estado para los campos del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    equipo: "",
    color: "#ff1801", // Rojo F1 por defecto
  });

  // Estado para el modo de edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [corredorEditandoId, setCorredorEditandoId] = useState<string | null>(
    null
  );

  // Estado para el filtro de corredores
  const [filtroCorredores, setFiltroCorredores] =
    useState<FiltroCorredores>("todos");

  // Estado para el buscador por número
  const [busquedaNumero, setBusquedaNumero] = useState("");

  // Estado para la lista de corredores
  const [corredores, setCorredores] = useState<Corredor[]>([
    {
      id: "1",
      nombre: "Lewis Hamilton",
      numero: "44",
      equipo: "Mercedes",
      color: "#00D2BE",
      activo: true,
      posicion: 1,
    },
    {
      id: "2",
      nombre: "Max Verstappen",
      numero: "33",
      equipo: "Red Bull",
      color: "#0600EF",
      activo: true,
      posicion: 2,
    },
    {
      id: "3",
      nombre: "Charles Leclerc",
      numero: "16",
      equipo: "Ferrari",
      color: "#DC0000",
      activo: false,
      posicion: 0,
    },
    {
      id: "4",
      nombre: "Lando Norris",
      numero: "4",
      equipo: "McLaren",
      color: "#FF8700",
      activo: true,
      posicion: 3,
    },
  ]);

  // Estado para los corredores activos (para la lista ordenable)
  const [corredoresActivos, setCorredoresActivos] = useState<Corredor[]>([]);

  // Cargar datos desde localStorage al iniciar
  useEffect(() => {
    const corredoresGuardados = localStorage.getItem("f1-corredores");
    if (corredoresGuardados) {
      try {
        setCorredores(JSON.parse(corredoresGuardados));
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    }
  }, []);

  // Guardar en localStorage cuando cambie el estado de corredores
  useEffect(() => {
    localStorage.setItem("f1-corredores", JSON.stringify(corredores));
  }, [corredores]);

  // Función para recalcular posiciones de corredores activos
  const recalcularPosiciones = (corredoresArray: Corredor[]): Corredor[] => {
    // Separar corredores activos e inactivos
    const activos = corredoresArray.filter((c) => c.activo);
    const inactivos = corredoresArray.filter((c) => !c.activo);

    // Asignar nuevas posiciones a los activos (1, 2, 3...)
    const activosConPosiciones = activos.map((corredor, index) => ({
      ...corredor,
      posicion: index + 1,
    }));

    // Asignar posición 0 a los inactivos
    const inactivosConPosiciones = inactivos.map((corredor) => ({
      ...corredor,
      posicion: 0,
    }));

    // Combinar ambos arrays
    return [...activosConPosiciones, ...inactivosConPosiciones];
  };

  // Actualizar corredoresActivos cuando cambie el estado de corredores
  useEffect(() => {
    const activos = corredores
      .filter((corredor) => corredor.activo)
      .sort((a, b) => a.posicion - b.posicion);

    setCorredoresActivos(activos);
    socket.emit("update_positions", activos); // Enviar a los demás
  }, [corredores]);

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Manejar cambios en el campo de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusquedaNumero(e.target.value);
  };

  // Función para agregar un nuevo corredor
  const agregarCorredor = () => {
    if (formData.nombre.trim() === "") return;

    if (modoEdicion && corredorEditandoId) {
      // Actualizar corredor existente
      const corredoresActualizados = corredores.map((corredor) =>
        corredor.id === corredorEditandoId
          ? {
              ...corredor,
              nombre: formData.nombre,
              numero: formData.numero,
              equipo: formData.equipo,
              color: formData.color,
            }
          : corredor
      );

      setCorredores(corredoresActualizados);
      cancelarEdicion();
    } else {
      // Agregar nuevo corredor
      const nuevosCorredores = [...corredores];

      // Contar cuántos corredores activos hay actualmente
      const numActivosActual = nuevosCorredores.filter((c) => c.activo).length;

      const nuevoCorredor: Corredor = {
        id: Date.now().toString(),
        nombre: formData.nombre,
        numero: formData.numero,
        equipo: formData.equipo,
        color: formData.color,
        activo: true,
        posicion: numActivosActual + 1, // Asignar la siguiente posición
      };

      nuevosCorredores.push(nuevoCorredor);
      setCorredores(nuevosCorredores);
      limpiarFormulario();
    }
  };

  // Función para iniciar la edición de un corredor
  const editarCorredor = (id: string) => {
    const corredor = corredores.find((c) => c.id === id);
    if (corredor) {
      setFormData({
        nombre: corredor.nombre,
        numero: corredor.numero,
        equipo: corredor.equipo,
        color: corredor.color,
      });
      setModoEdicion(true);
      setCorredorEditandoId(id);
    }
  };

  // Función para cancelar la edición
  const cancelarEdicion = () => {
    setModoEdicion(false);
    setCorredorEditandoId(null);
    limpiarFormulario();
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setFormData({
      nombre: "",
      numero: "",
      equipo: "",
      color: "#ff1801", // Rojo F1 por defecto
    });
  };

  // Función para eliminar un corredor
  const eliminarCorredor = (id: string) => {
    // Si estamos editando este corredor, cancelar la edición
    if (corredorEditandoId === id) {
      cancelarEdicion();
    }

    // Filtrar el corredor a eliminar
    const nuevosCorredores = corredores.filter(
      (corredor) => corredor.id !== id
    );

    // Recalcular posiciones
    const corredoresActualizados = recalcularPosiciones(nuevosCorredores);

    // Actualizar estado
    setCorredores(corredoresActualizados);
  };

  // Función para cambiar el estado activo/inactivo de un corredor
  const toggleActivoCorredor = (id: string) => {
    // Primero cambiamos el estado activo del corredor
    const nuevosCorredores = corredores.map((corredor) =>
      corredor.id === id ? { ...corredor, activo: !corredor.activo } : corredor
    );

    // Luego recalculamos todas las posiciones
    const corredoresActualizados = recalcularPosiciones(nuevosCorredores);

    // Actualizamos el estado
    setCorredores(corredoresActualizados);
  };

  // Función para actualizar las posiciones después de reordenar
  const actualizarPosiciones = (corredoresReordenados: Corredor[]) => {
    // Actualizar las posiciones de los corredores reordenados
    const corredoresConNuevasPosiciones = corredoresReordenados.map(
      (corredor, index) => ({
        ...corredor,
        posicion: index + 1,
      })
    );

    socket.emit("update_positions", corredoresConNuevasPosiciones); // Enviar a los demás

    setCorredoresActivos(corredoresConNuevasPosiciones);

    // Actualizar las posiciones en el estado principal de corredores
    setCorredores((prevCorredores) => {
      const corredoresActualizados = prevCorredores.map((corredor) => {
        // Buscar si este corredor está en la lista reordenada
        const corredorReordenado = corredoresConNuevasPosiciones.find(
          (c) => c.id === corredor.id
        );
        if (corredorReordenado) {
          // Si está en la lista reordenada, actualizar su posición
          return { ...corredor, posicion: corredorReordenado.posicion };
        }
        // Si no está en la lista reordenada, mantener su posición actual
        return corredor;
      });

      return corredoresActualizados;
    });
  };

  // Filtrar corredores según el filtro seleccionado y la búsqueda por número
  const corredoresFiltrados = corredores
    .filter((corredor) => {
      // Primero aplicar el filtro de estado (todos/activos/inactivos)
      if (filtroCorredores === "todos") return true;
      if (filtroCorredores === "activos") return corredor.activo;
      if (filtroCorredores === "inactivos") return !corredor.activo;
      return true;
    })
    .filter((corredor) => {
      // Luego aplicar el filtro de búsqueda por número
      if (!busquedaNumero) return true;
      return corredor.numero
        .toLowerCase()
        .includes(busquedaNumero.toLowerCase());
    })
    .sort((a, b) => {
      // Si ambos tienen posición 0 (inactivos), ordenar por nombre
      if (a.posicion === 0 && b.posicion === 0) {
        return a.nombre.localeCompare(b.nombre);
      }
      // Si solo uno tiene posición 0, el que tiene posición va primero
      if (a.posicion === 0) return 1;
      if (b.posicion === 0) return -1;
      // Si ambos tienen posición, ordenar por posición
      return a.posicion - b.posicion;
    });

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    agregarCorredor();
  };

  // Limpiar la búsqueda
  const limpiarBusqueda = () => {
    setBusquedaNumero("");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto py-8 px-4">
        {/* Encabezado F1 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff1801] rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(255,24,1,0.3)]">
              <Flag className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              MTK3 CONTROL
            </h1>
          </div>
          <div className="text-sm text-gray-500">TEMPORADA 2025</div>
        </div>

        {/* Panel principal */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.5)] mb-8 overflow-hidden">
          <div className="p-6 bg-[#0a0a0a] bg-[radial-gradient(circle_at_top,rgba(40,40,40,0.1),transparent)]">
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="nombre"
                  className="block text-sm font-medium text-gray-400"
                >
                  Nombre del piloto
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff1801] text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="numero"
                  className="block text-sm font-medium text-gray-400"
                >
                  Número del piloto
                </label>
                <input
                  id="numero"
                  name="numero"
                  type="text"
                  placeholder="Ej: 44"
                  value={formData.numero}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff1801] text-white"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="equipo"
                  className="block text-sm font-medium text-gray-400"
                >
                  Escudería
                </label>
                <input
                  id="equipo"
                  name="equipo"
                  type="text"
                  placeholder="Nombre del equipo"
                  value={formData.equipo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff1801] text-white"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="color"
                  className="block text-sm font-medium text-gray-400"
                >
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="color"
                    name="color"
                    type="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="h-10 w-10 border border-[#333] rounded cursor-pointer bg-transparent"
                  />
                  <div className="flex-1 flex gap-2">
                    {modoEdicion ? (
                      <>
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-[#ff1801] to-[#9b0000] hover:from-[#ff3c29] hover:to-[#c20000] text-white font-medium py-2 px-4 rounded-md transition-colors shadow-[0_0_10px_rgba(255,24,1,0.2)] flex items-center justify-center gap-1"
                        >
                          <Save className="h-4 w-4" />
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelarEdicion}
                          className="flex-1 bg-[#333] hover:bg-[#444] text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#ff1801] to-[#9b0000] hover:from-[#ff3c29] hover:to-[#c20000] text-white font-medium py-2 px-4 rounded-md transition-colors shadow-[0_0_10px_rgba(255,24,1,0.2)]"
                      >
                        Agregar Piloto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Lista de corredores */}
              <div className="bg-[#0a0a0a] rounded-lg border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="p-4">
                  {/* Buscador por número */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={busquedaNumero}
                      onChange={handleSearchChange}
                      placeholder="Buscar por número de piloto..."
                      className="w-full pl-10 pr-10 py-2 bg-[#111] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff1801] text-white"
                    />
                    {busquedaNumero && (
                      <button
                        onClick={limpiarBusqueda}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Tabs para filtrar */}
                  <div className="flex border border-[#222] rounded-md overflow-hidden mb-4">
                    <button
                      onClick={() => setFiltroCorredores("todos")}
                      className={`flex-1 py-2 px-4 text-center ${
                        filtroCorredores === "todos"
                          ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.3)]"
                          : "bg-[#111] hover:bg-[#181818]"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFiltroCorredores("activos")}
                      className={`flex-1 py-2 px-4 text-center ${
                        filtroCorredores === "activos"
                          ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.3)]"
                          : "bg-[#111] hover:bg-[#181818]"
                      }`}
                    >
                      Activos
                    </button>
                    <button
                      onClick={() => setFiltroCorredores("inactivos")}
                      className={`flex-1 py-2 px-4 text-center ${
                        filtroCorredores === "inactivos"
                          ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.3)]"
                          : "bg-[#111] hover:bg-[#181818]"
                      }`}
                    >
                      Inactivos
                    </button>
                  </div>

                  <div className="space-y-3">
                    {corredoresFiltrados.length > 0 ? (
                      corredoresFiltrados.map((corredor) => (
                        <div
                          key={corredor.id}
                          className="flex items-center justify-between p-3 border border-[#222] rounded-lg bg-[#0f0f0f] hover:bg-[#151515] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-10 h-10 rounded-md text-white text-sm font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                              style={{ backgroundColor: corredor.color }}
                            >
                              {corredor.numero || "?"}
                            </div>
                            <div>
                              <div className="font-bold tracking-wide text-white">
                                {corredor.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                {corredor.equipo && (
                                  <span className="inline-block px-2 py-0.5 bg-[#111] rounded-full mr-2 border border-[#222]">
                                    {corredor.equipo}
                                  </span>
                                )}
                                {corredor.posicion > 0 ? (
                                  <span className="text-[#ff1801]">
                                    P{corredor.posicion}
                                  </span>
                                ) : (
                                  <span className="text-gray-600">
                                    Sin posición
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative inline-block w-12 mr-2 align-middle select-none">
                              <input
                                type="checkbox"
                                id={`switch-${corredor.id}`}
                                checked={corredor.activo}
                                onChange={() =>
                                  toggleActivoCorredor(corredor.id)
                                }
                                className="sr-only"
                              />
                              <label
                                htmlFor={`switch-${corredor.id}`}
                                className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                                  corredor.activo
                                    ? "bg-[#ff1801] shadow-[0_0_8px_rgba(255,24,1,0.4)]"
                                    : "bg-[#333]"
                                }`}
                              >
                                <span
                                  className={`block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform ${
                                    corredor.activo
                                      ? "translate-x-6"
                                      : "translate-x-0"
                                  }`}
                                ></span>
                              </label>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => editarCorredor(corredor.id)}
                                className="p-1.5 bg-[#222] hover:bg-[#333] rounded-md text-gray-300 hover:text-white transition-colors"
                                title="Editar piloto"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => eliminarCorredor(corredor.id)}
                                className="p-1.5 bg-[#331111] hover:bg-[#661111] rounded-md text-gray-300 hover:text-white transition-colors"
                                title="Eliminar piloto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 text-gray-600 bg-[#0f0f0f] rounded-lg border border-[#222]">
                        {busquedaNumero ? (
                          <>
                            No se encontraron pilotos con el número{" "}
                            <span className="text-[#ff1801]">
                              {busquedaNumero}
                            </span>
                            <div className="mt-2">
                              <button
                                onClick={limpiarBusqueda}
                                className="text-[#ff1801] hover:text-white text-sm underline"
                              >
                                Limpiar búsqueda
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            No hay pilotos{" "}
                            {filtroCorredores !== "todos"
                              ? filtroCorredores
                              : ""}{" "}
                            para mostrar
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista ordenable */}
              <div className="bg-[#0a0a0a] rounded-lg border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="bg-[#111] border-b border-[#222] p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[#ff1801]" />
                    Torre de ordenamiento
                  </h3>
                </div>
                <div className="p-4">
                  {corredoresActivos.length > 0 ? (
                    <Reorder.Group
                      axis="y"
                      values={corredoresActivos}
                      onReorder={actualizarPosiciones}
                      className="space-y-2"
                    >
                      {corredoresActivos.map((corredor) => (
                        <Reorder.Item
                          key={corredor.id}
                          value={corredor}
                          className="p-3 border border-[#222] rounded-lg bg-[#0f0f0f] cursor-move hover:bg-[#151515] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#111] text-white font-bold border border-[#222]">
                              {corredor.posicion}
                            </div>
                            <div
                              className="flex items-center justify-center w-10 h-10 rounded-md text-white text-sm font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                              style={{ backgroundColor: corredor.color }}
                            >
                              {corredor.numero || "?"}
                            </div>
                            <div>
                              <div className="font-bold tracking-wide text-white">
                                {corredor.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                {corredor.equipo && (
                                  <span className="inline-block px-2 py-0.5 bg-[#111] rounded-full border border-[#222]">
                                    {corredor.equipo}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-auto">
                              <GripVertical className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  ) : (
                    <div className="text-center p-6 text-gray-600 bg-[#0f0f0f] rounded-lg border border-[#222]">
                      No hay pilotos activos para mostrar
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import {
  Trophy,
  Users,
  Grip,
  Flag,
  Trash2,
  Edit2,
  Save,
  X,
  Search,
  Shuffle,
  Users2,
  Clock,
} from "lucide-react";
import type { Corredor, Manga } from "@/lib/types";
import { socket } from "@/lib/socketClient";

type FiltroCorredores = "todos" | "activos" | "inactivos";
type VistaPrincipal = "corredores" | "mangas";

export const runtime = "edge";
export default function SistemaCorredores() {
  // Estado para los campos del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    equipo: "",
    ciudad: "",
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

  // Estado para la vista principal (corredores o mangas)
  const [vistaPrincipal, setVistaPrincipal] =
    useState<VistaPrincipal>("corredores");

  // Estado para el buscador por número
  const [busquedaNumero, setBusquedaNumero] = useState("");

  // Estado para la pestaña activa en la sección de datos
  const [pestañaDatos, setPestañaDatos] = useState<"corredores" | "posiciones">(
    "corredores"
  );

  // Estado para las mangas
  const [mangas, setMangas] = useState<Manga[]>([]);

  // Estado para la manga actual seleccionada
  const [mangaActual, setMangaActual] = useState<number | null>(null);

  // Estado para la lista de corredores
  const [corredores, setCorredores] = useState<Corredor[]>([]);

  // Estado para los corredores de la manga actual (para la lista ordenable)
  const [corredoresMangaActual, setCorredoresMangaActual] = useState<
    Corredor[]
  >([]);

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

    const mangasGuardadas = localStorage.getItem("f1-mangas");
    if (mangasGuardadas) {
      try {
        setMangas(JSON.parse(mangasGuardadas));
      } catch (error) {
        console.error("Error al cargar mangas:", error);
      }
    }

    const mangaActualGuardada = localStorage.getItem("f1-manga-actual");
    if (mangaActualGuardada) {
      try {
        setMangaActual(JSON.parse(mangaActualGuardada));
      } catch (error) {
        console.error("Error al cargar manga actual:", error);
      }
    }
  }, []);

  // Guardar en localStorage cuando cambie el estado de corredores
  useEffect(() => {
    localStorage.setItem("f1-corredores", JSON.stringify(corredores));
  }, [corredores]);

  // Guardar en localStorage cuando cambien las mangas
  useEffect(() => {
    localStorage.setItem("f1-mangas", JSON.stringify(mangas));
  }, [mangas]);

  // Guardar en localStorage cuando cambie la manga actual
  useEffect(() => {
    localStorage.setItem("f1-manga-actual", JSON.stringify(mangaActual));
  }, [mangaActual]);

  // Actualizar corredoresMangaActual cuando cambie el estado de corredores o la manga actual
  useEffect(() => {
    if (mangaActual === null) {
      setCorredoresMangaActual([]);
      return;
    }

    const corredoresDeManga = corredores
      .filter((c) => c.activo && c.manga === mangaActual)
      .sort((a, b) => a.posicionEnManga - b.posicionEnManga);

    setCorredoresMangaActual(corredoresDeManga);
    socket.emit("update_positions", corredoresDeManga); // Enviar a los demás
  }, [corredores, mangaActual]);

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
              ciudad: formData.ciudad,
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
        ciudad: formData.ciudad,
        equipo: formData.equipo,
        color: formData.color,
        activo: true,
        posicion: numActivosActual + 1, // Asignar la siguiente posición
        manga: null,
        posicionEnManga: 0,
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
        ciudad: corredor.ciudad,
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
      ciudad: "",
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

    // Actualizar las mangas
    const mangasActualizadas = mangas.map((manga) => ({
      ...manga,
      corredores: manga.corredores.filter((corredorId) => corredorId !== id),
    }));

    setMangas(mangasActualizadas);
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
    if (mangaActual === null) return;

    // Actualizar las posiciones en manga de los corredores reordenados
    const corredoresConNuevasPosiciones = corredoresReordenados.map(
      (corredor, index) => ({
        ...corredor,
        posicionEnManga: index + 1,
      })
    );

    socket.emit("update_positions", corredoresConNuevasPosiciones); // Enviar a los demás
    setCorredoresMangaActual(corredoresConNuevasPosiciones);

    // Actualizar las posiciones en el estado principal de corredores
    setCorredores((prevCorredores) => {
      const corredoresActualizados = prevCorredores.map((corredor) => {
        // Buscar si este corredor está en la lista reordenada
        const corredorReordenado = corredoresConNuevasPosiciones.find(
          (c) => c.id === corredor.id
        );
        if (corredorReordenado) {
          // Si está en la lista reordenada, actualizar su posición en manga
          return {
            ...corredor,
            posicionEnManga: corredorReordenado.posicionEnManga,
          };
        }
        // Si no está en la lista reordenada, mantener su posición actual
        return corredor;
      });

      return corredoresActualizados;
    });
  };

  // Función para realizar el sorteo de mangas
  const realizarSorteo = () => {
    // Obtener solo los corredores activos
    const corredoresParaSorteo = corredores.filter((c) => c.activo);

    // Si no hay corredores activos, no hacer nada
    if (corredoresParaSorteo.length === 0) return;

    // Mezclar aleatoriamente los corredores
    const corredoresMezclados = [...corredoresParaSorteo].sort(
      () => Math.random() - 0.5
    );

    // Calcular cuántas mangas necesitamos (4 corredores por manga)
    const corredoresPorManga = 4;
    const numMangas = Math.ceil(
      corredoresMezclados.length / corredoresPorManga
    );

    // Crear las mangas
    const nuevasMangas: Manga[] = [];

    for (let i = 0; i < numMangas; i++) {
      nuevasMangas.push({
        id: `manga-${i + 1}`,
        numero: i + 1,
        corredores: [],
        completada: false,
      });
    }

    // Asignar corredores a las mangas
    corredoresMezclados.forEach((corredor, index) => {
      const mangaIndex = Math.floor(index / corredoresPorManga);
      nuevasMangas[mangaIndex].corredores.push(corredor.id);
    });

    // Actualizar el estado de las mangas
    setMangas(nuevasMangas);

    // Actualizar el estado de los corredores con su manga asignada
    const corredoresActualizados = corredores.map((corredor) => {
      // Buscar en qué manga está este corredor
      const manga = nuevasMangas.find((m) =>
        m.corredores.includes(corredor.id)
      );

      // Calcular la posición inicial en la manga (basada en el orden del sorteo)
      let posicionEnManga = 0;
      if (manga) {
        const indexEnManga = manga.corredores.indexOf(corredor.id);
        posicionEnManga = indexEnManga + 1;
      }

      return {
        ...corredor,
        manga: manga ? manga.numero : null,
        posicionEnManga: posicionEnManga,
      };
    });

    setCorredores(corredoresActualizados);

    // Si no hay manga actual seleccionada, seleccionar la primera
    if (mangaActual === null && nuevasMangas.length > 0) {
      setMangaActual(1);
    }

    // Cambiar a la vista de mangas
    setVistaPrincipal("mangas");
  };

  // Función para resetear las mangas
  const resetearMangas = () => {
    // Eliminar todas las mangas
    setMangas([]);

    // Resetear la asignación de manga en todos los corredores
    const corredoresActualizados = corredores.map((corredor) => ({
      ...corredor,
      manga: null,
      posicionEnManga: 0,
    }));

    setCorredores(corredoresActualizados);

    // Resetear la manga actual
    setMangaActual(null);
  };

  // Función para marcar una manga como completada
  const toggleMangaCompletada = (numeroManga: number) => {
    const mangasActualizadas = mangas.map((manga) =>
      manga.numero === numeroManga
        ? { ...manga, completada: !manga.completada }
        : manga
    );

    setMangas(mangasActualizadas);
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

  // Obtener array de posiciones (corredores ordenados por posición)
  const arrayPosiciones = [...corredores]
    .filter((c) => c.activo)
    .sort((a, b) => a.posicion - b.posicion)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      numero: c.numero,
      equipo: c.equipo,
      color: c.color,
      posicion: c.posicion,
      manga: c.manga,
      posicionEnManga: c.posicionEnManga,
    }));

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    agregarCorredor();
  };

  // Limpiar la búsqueda
  const limpiarBusqueda = () => {
    setBusquedaNumero("");
  };

  // Obtener el número total de corredores activos
  const totalCorredoresActivos = corredores.filter((c) => c.activo).length;

  // Obtener la manga actual como objeto
  const mangaActualObj =
    mangaActual !== null ? mangas.find((m) => m.numero === mangaActual) : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto py-8 px-4">
        {/* Encabezado F1 */}
        <div className="mb-8 flex items-center justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff1801] rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(255,24,1,0.3)]">
              <Flag className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              MTK3 CONTROL
            </h1>
          </div>
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
                  htmlFor="equipo"
                  className="block text-sm font-medium text-gray-400"
                >
                  Ciudad
                </label>
                <input
                  id="ciudad"
                  name="ciudad"
                  type="text"
                  placeholder="Nombre la ciudad"
                  value={formData.ciudad}
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

            {/* Sección de sorteo de mangas */}
            <div className="mb-6 p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Sorteo de Mangas
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Divide a los pilotos activos ({totalCorredoresActivos}) en
                    mangas de 4 pilotos cada una.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={realizarSorteo}
                    className="bg-[#ff1801] hover:bg-[#ff3c29] text-white font-medium py-2 px-4 rounded-md transition-colors shadow-[0_0_10px_rgba(255,24,1,0.2)] flex items-center gap-2"
                    disabled={totalCorredoresActivos === 0}
                  >
                    <Shuffle className="h-4 w-4" />
                    Realizar Sorteo
                  </button>
                  {mangas.length > 0 && (
                    <button
                      onClick={resetearMangas}
                      className="bg-[#333] hover:bg-[#444] text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Resetear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de manga actual */}
            {mangas.length > 0 && (
              <div className="mb-6 p-4 bg-[#0f0f0f] border border-[#222] rounded-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Manga Actual</h3>
                    <p className="text-gray-400 text-sm">
                      Selecciona la manga que se está corriendo actualmente para
                      ordenar sus pilotos.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mangas.map((manga) => (
                      <button
                        key={manga.id}
                        onClick={() => setMangaActual(manga.numero)}
                        className={`py-2 px-4 rounded-md transition-colors flex items-center gap-2 ${
                          mangaActual === manga.numero
                            ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.2)]"
                            : manga.completada
                            ? "bg-[#1a3a1a] text-gray-300 border border-[#2a4a2a]"
                            : "bg-[#222] text-gray-300 hover:bg-[#333]"
                        }`}
                      >
                        {manga.completada ? (
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            Manga {manga.numero}
                          </span>
                        ) : (
                          <span>Manga {manga.numero}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs para cambiar entre vista de corredores y mangas */}
            <div className="flex border border-[#222] rounded-md overflow-hidden mb-6">
              <button
                onClick={() => setVistaPrincipal("corredores")}
                className={`flex-1 py-2 px-4 text-center flex items-center justify-center gap-2 ${
                  vistaPrincipal === "corredores"
                    ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.3)]"
                    : "bg-[#111] hover:bg-[#181818]"
                }`}
              >
                <Users className="h-4 w-4" />
                Lista de Pilotos
              </button>
              <button
                onClick={() => setVistaPrincipal("mangas")}
                className={`flex-1 py-2 px-4 text-center flex items-center justify-center gap-2 ${
                  vistaPrincipal === "mangas"
                    ? "bg-[#ff1801] text-white shadow-[0_0_10px_rgba(255,24,1,0.3)]"
                    : "bg-[#111] hover:bg-[#181818]"
                }`}
              >
                <Users2 className="h-4 w-4" />
                Mangas ({mangas.length})
              </button>
            </div>

            {vistaPrincipal === "corredores" ? (
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
                                    <div>
                                      <span className="text-[#ff1801]">
                                        P{corredor.posicion}
                                      </span>
                                      <span className="inline-block px-2 py-0.5 bg-[#111] rounded-full mr-2 border border-[#222]">
                                        {corredor.ciudad}
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-gray-600">
                                        Sin posición
                                      </span>
                                      <span className="inline-block px-2 py-0.5 bg-[#111] rounded-full mr-2 border border-[#222]">
                                        {corredor.ciudad}
                                      </span>
                                    </div>
                                  )}
                                  {corredor.manga && (
                                    <span className="ml-2 inline-block px-2 py-0.5 bg-[#1a1a1a] rounded-full border border-[#333]">
                                      Manga {corredor.manga}
                                      {corredor.posicionEnManga > 0 && (
                                        <span className="ml-1 text-[#ff1801]">
                                          P{corredor.posicionEnManga}
                                        </span>
                                      )}
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

                {/* Lista ordenable de la manga actual */}
                <div className="bg-[#0a0a0a] rounded-lg border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <div className="bg-[#111] border-b border-[#222] p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[#ff1801]" />
                      {mangaActual !== null ? (
                        <span>MANGA {mangaActual} (ARRASTRA PARA ORDENAR)</span>
                      ) : (
                        <span>SELECCIONA UNA MANGA</span>
                      )}
                    </h3>
                    {mangaActual !== null && mangaActualObj && (
                      <button
                        onClick={() => toggleMangaCompletada(mangaActual)}
                        className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                          mangaActualObj.completada
                            ? "bg-[#1a3a1a] text-green-300 hover:bg-[#2a4a2a]"
                            : "bg-[#222] text-gray-300 hover:bg-[#333]"
                        }`}
                        title={
                          mangaActualObj.completada
                            ? "Marcar como pendiente"
                            : "Marcar como completada"
                        }
                      >
                        <Clock className="h-3 w-3" />
                        {mangaActualObj.completada ? "Completada" : "Pendiente"}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {mangaActual !== null ? (
                      corredoresMangaActual.length > 0 ? (
                        <Reorder.Group
                          axis="y"
                          values={corredoresMangaActual}
                          onReorder={actualizarPosiciones}
                          className="space-y-2"
                        >
                          {corredoresMangaActual.map((corredor) => (
                            <Reorder.Item
                              key={corredor.id}
                              value={corredor}
                              className="p-3 border border-[#222] rounded-lg bg-[#0f0f0f] cursor-move hover:bg-[#151515] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#111] text-white font-bold border border-[#222]">
                                  {corredor.posicionEnManga}
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
                                  <Grip className="h-5 w-5 text-gray-600" />
                                </div>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      ) : (
                        <div className="text-center p-6 text-gray-600 bg-[#0f0f0f] rounded-lg border border-[#222]">
                          No hay pilotos en la manga {mangaActual}
                        </div>
                      )
                    ) : (
                      <div className="text-center p-6 text-gray-600 bg-[#0f0f0f] rounded-lg border border-[#222]">
                        {mangas.length > 0 ? (
                          <>
                            Selecciona una manga para ver y ordenar sus pilotos
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                              {mangas.map((manga) => (
                                <button
                                  key={manga.id}
                                  onClick={() => setMangaActual(manga.numero)}
                                  className="bg-[#222] hover:bg-[#333] text-white font-medium py-1 px-3 rounded-md transition-colors"
                                >
                                  Manga {manga.numero}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            No hay mangas creadas. Realiza un sorteo para crear
                            mangas.
                            <div className="mt-4">
                              <button
                                onClick={realizarSorteo}
                                className="bg-[#ff1801] hover:bg-[#ff3c29] text-white font-medium py-2 px-4 rounded-md transition-colors shadow-[0_0_10px_rgba(255,24,1,0.2)] flex items-center gap-2 mx-auto"
                                disabled={totalCorredoresActivos === 0}
                              >
                                <Shuffle className="h-4 w-4" />
                                Realizar Sorteo
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Vista de mangas */
              <div className="bg-[#0a0a0a] rounded-lg border border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="bg-[#111] border-b border-[#222] p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-[#ff1801]" />
                    MANGAS DE COMPETICIÓN
                  </h3>
                </div>
                <div className="p-4">
                  {mangas.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {mangas.map((manga) => {
                        // Obtener los corredores de esta manga
                        const corredoresDeManga = corredores
                          .filter((c) => manga.corredores.includes(c.id))
                          .sort(
                            (a, b) => a.posicionEnManga - b.posicionEnManga
                          );

                        return (
                          <div
                            key={manga.id}
                            className={`border rounded-lg overflow-hidden ${
                              mangaActual === manga.numero
                                ? "border-[#ff1801] bg-[#0f0f0f] shadow-[0_0_10px_rgba(255,24,1,0.15)]"
                                : manga.completada
                                ? "border-[#2a4a2a] bg-[#0f0f0f]"
                                : "border-[#222] bg-[#0f0f0f]"
                            }`}
                          >
                            <div
                              className={`p-3 border-b flex justify-between items-center ${
                                mangaActual === manga.numero
                                  ? "bg-[#1a1a1a] border-[#ff1801]"
                                  : manga.completada
                                  ? "bg-[#1a3a1a] border-[#2a4a2a]"
                                  : "bg-[#181818] border-[#222]"
                              }`}
                            >
                              <div>
                                <h4 className="font-bold text-white flex items-center gap-2">
                                  {manga.completada && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                  )}
                                  Manga {manga.numero}
                                  {mangaActual === manga.numero && (
                                    <span className="text-xs bg-[#ff1801] text-white px-2 py-0.5 rounded-full">
                                      Actual
                                    </span>
                                  )}
                                </h4>
                                <div className="text-xs text-gray-500">
                                  {corredoresDeManga.length} pilotos
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setMangaActual(manga.numero)}
                                  className={`px-3 py-1 rounded text-xs ${
                                    mangaActual === manga.numero
                                      ? "bg-[#ff1801] text-white"
                                      : "bg-[#222] text-gray-300 hover:bg-[#333]"
                                  }`}
                                >
                                  {mangaActual === manga.numero
                                    ? "Seleccionada"
                                    : "Seleccionar"}
                                </button>
                                <button
                                  onClick={() =>
                                    toggleMangaCompletada(manga.numero)
                                  }
                                  className={`px-3 py-1 rounded text-xs ${
                                    manga.completada
                                      ? "bg-[#1a3a1a] text-green-300 hover:bg-[#2a4a2a]"
                                      : "bg-[#222] text-gray-300 hover:bg-[#333]"
                                  }`}
                                >
                                  {manga.completada
                                    ? "Completada"
                                    : "Pendiente"}
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              {corredoresDeManga.length > 0 ? (
                                <div className="space-y-2">
                                  {corredoresDeManga.map((corredor) => (
                                    <div
                                      key={corredor.id}
                                      className="flex items-center gap-3 p-2 border border-[#222] rounded-lg bg-[#111]"
                                    >
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1a1a1a] text-white text-xs font-bold border border-[#333]">
                                        {corredor.posicionEnManga || "-"}
                                      </div>
                                      <div
                                        className="flex items-center justify-center w-8 h-8 rounded-md text-white text-sm font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                        style={{
                                          backgroundColor: corredor.color,
                                        }}
                                      >
                                        {corredor.numero || "?"}
                                      </div>
                                      <div>
                                        <div className="font-medium text-white">
                                          {corredor.nombre}
                                        </div>
                                        {corredor.equipo && (
                                          <div className="text-xs text-gray-500">
                                            {corredor.equipo}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center p-4 text-gray-600">
                                  No hay pilotos asignados a esta manga
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-gray-600 bg-[#0f0f0f] rounded-lg border border-[#222]">
                      No hay mangas creadas. Realiza un sorteo para crear
                      mangas.
                      <div className="mt-4">
                        <button
                          onClick={realizarSorteo}
                          className="bg-[#ff1801] hover:bg-[#ff3c29] text-white font-medium py-2 px-4 rounded-md transition-colors shadow-[0_0_10px_rgba(255,24,1,0.2)] flex items-center gap-2 mx-auto"
                          disabled={totalCorredoresActivos === 0}
                        >
                          <Shuffle className="h-4 w-4" />
                          Realizar Sorteo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

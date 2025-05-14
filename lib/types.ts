export interface Corredor {
  id: string;
  nombre: string;
  numero: string;
  equipo: string;
  ciudad: string;
  color: string;
  activo: boolean;
  posicion: number;
  manga: number | null;
  posicionEnManga: number;
}
export interface Manga {
  id: string;
  numero: number;
  corredores: string[]; // IDs de los corredores en esta manga
  completada: boolean;
}

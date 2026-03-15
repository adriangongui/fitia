type Sexo = "hombre" | "mujer";
type Actividad = "sedentario" | "moderado" | "activo" | "muy_activo";
type Objetivo = "ganar_musculo" | "perder_grasa" | "mantenimiento";

export function calcularMacros(
  peso: number,
  altura: number,
  edad: number,
  sexo: Sexo,
  actividad: Actividad,
  objetivo: Objetivo
) {
  // 1. Calcular BMR (Harris-Benedict)
  let bmr = 0;
  if (sexo === "hombre") {
    bmr = 88.362 + 13.397 * peso + 4.799 * altura - 5.677 * edad;
  } else {
    bmr = 447.593 + 9.247 * peso + 3.098 * altura - 4.330 * edad;
  }

  // 2. Multiplicador de actividad
  let multiplicador = 1.2; // sedentario
  if (actividad === "moderado") multiplicador = 1.55;
  if (actividad === "activo") multiplicador = 1.725;
  if (actividad === "muy_activo") multiplicador = 1.9;

  let tdee = bmr * multiplicador;

  // 3. Ajuste por objetivo
  if (objetivo === "ganar_musculo") tdee += 300;
  if (objetivo === "perder_grasa") tdee -= 400;
  // mantenimiento => tdee += 0

  const calorias = Math.round(tdee);

  // 4. Reparto de macros
  // General standard:
  // Proteinas: 2g a 2.2g por kg de peso
  const proteinas = Math.round(peso * 2.1);
  const kcalProteinas = proteinas * 4;

  // Grasas: 0.8g a 1g por kg de peso o ~25-30% de calorias
  // Para simplificar, usamos 25% de las calorías totales
  const kcalGrasas = calorias * 0.25;
  const grasas = Math.round(kcalGrasas / 9);

  // Carbohidratos: el resto
  const kcalCarbos = calorias - kcalProteinas - kcalGrasas;
  const carbohidratos = Math.max(0, Math.round(kcalCarbos / 4));

  return {
    calorias,
    proteinas,
    carbohidratos,
    grasas,
  };
}

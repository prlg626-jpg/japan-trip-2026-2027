import type { MealRecommendation } from "../utils/mealRecommendations";

export function MealRecommendationCard({ recommendation }: { recommendation: MealRecommendation | null }) {
  if (!recommendation) return null;
  return <aside className="mealRecommendation" aria-label="Dónde comer">
    <strong>Dónde comer · {recommendation.name}</strong>
    <p>{recommendation.description}</p>
    <p>{recommendation.address}</p>
    <div className="actionRow">
      <a className="chipButton" href={recommendation.mapsUrl} target="_blank" rel="noreferrer">Cómo llegar al restaurante</a>
      <a className="chipButton" href={recommendation.officialUrl} target="_blank" rel="noreferrer">Menú y sitio oficial</a>
    </div>
  </aside>;
}

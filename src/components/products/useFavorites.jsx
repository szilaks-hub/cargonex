import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";

export function useFavorites() {
  const qc = useQueryClient();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u?.email || null)).catch(() => {});
  }, []);

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", userEmail],
    queryFn: () =>
      userEmail
        ? base44.entities.UserFavoriteProduct.filter({ user_email: userEmail })
        : Promise.resolve([]),
    enabled: !!userEmail,
  });

  const favoriteProductIds = new Set(favorites.map((f) => f.product_id));

  const toggleFavorite = async (productId) => {
    if (!userEmail) return;
    const existing = favorites.find((f) => f.product_id === productId);
    if (existing) {
      await base44.entities.UserFavoriteProduct.delete(existing.id);
    } else {
      await base44.entities.UserFavoriteProduct.create({ user_email: userEmail, product_id: productId });
    }
    qc.invalidateQueries({ queryKey: ["favorites", userEmail] });
  };

  return { favoriteProductIds, toggleFavorite };
}
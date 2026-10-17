package com.app.AnnoncesAPI.enums;

import java.util.EnumSet;
import java.util.Set;

public enum TypeBien {

  APPARTEMENT(EnumSet.of(TypeUsage.HABITATION)),
  MAISON(EnumSet.of(TypeUsage.HABITATION)),
  VILLA(EnumSet.of(TypeUsage.HABITATION, TypeUsage.LOISIR)),
  TERRAIN(EnumSet.of(TypeUsage.HABITATION, TypeUsage.COMMERCIAL, TypeUsage.LOISIR, TypeUsage.PROFESSIONNEL, TypeUsage.AUTRE)),
  DOMAINE(EnumSet.of(TypeUsage.AGRICOLE, TypeUsage.LOISIR, TypeUsage.PROFESSIONNEL, TypeUsage.AUTRE)),
  MAGASIN(EnumSet.of(TypeUsage.COMMERCIAL)),
  BUREAU(EnumSet.of(TypeUsage.PROFESSIONNEL)),
  ENTREPOT(EnumSet.of(TypeUsage.COMMERCIAL, TypeUsage.PROFESSIONNEL)),
  AUTRE(EnumSet.allOf(TypeUsage.class));

  private final Set<TypeUsage> usagesAutorises;

  TypeBien(Set<TypeUsage> usagesAutorises) {
    this.usagesAutorises = usagesAutorises;
  }

  public Set<TypeUsage> getUsagesAutorises() {
    return usagesAutorises;
  }

  public boolean accepte(TypeUsage typeUsage) {
    return usagesAutorises.contains(typeUsage);
  }

  /** Faux pour les biens non bâtis (terrain nu, domaine), vendus ou loués en l'état. */
  public boolean estBati() {
    return this != TERRAIN && this != DOMAINE;
  }
}
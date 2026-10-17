package com.app.AnnoncesAPI.enums;

import java.util.EnumSet;
import java.util.Set;

public enum TypeAnnonce {

  VENTE("VE", EnumSet.allOf(TypeBien.class)),
  LOCATION("LO", EnumSet.of(
      TypeBien.APPARTEMENT, TypeBien.MAISON, TypeBien.VILLA,
      TypeBien.TERRAIN, TypeBien.MAGASIN, TypeBien.BUREAU,
      TypeBien.ENTREPOT, TypeBien.AUTRE)),
  BAIL("BA", EnumSet.of(TypeBien.MAGASIN, TypeBien.BUREAU, TypeBien.ENTREPOT));

  private final String prefix;
  private final Set<TypeBien> typesBienAutorises;

  TypeAnnonce(String prefix, Set<TypeBien> typesBienAutorises) {
    this.prefix = prefix;
    this.typesBienAutorises = typesBienAutorises;
  }

  public String getPrefix() {
    return prefix;
  }

  public Set<TypeBien> getTypesBienAutorises() {
    return typesBienAutorises;
  }

  public boolean accepte(TypeBien typeBien) {
    return typesBienAutorises.contains(typeBien);
  }
}
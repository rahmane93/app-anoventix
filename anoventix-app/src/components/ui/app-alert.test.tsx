import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { appAlert } from './app-alert';
import { OverlayHost } from './overlay-host';

jest.useFakeTimers();

describe('appAlert', () => {
  it('affiche titre, message et boutons, puis exécute l’action choisie', () => {
    const onDelete = jest.fn();
    render(<OverlayHost />);

    act(() => {
      appAlert('Supprimer cette photo ?', 'Elle sera retirée de l’annonce.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]);
    });

    expect(screen.getByText('Supprimer cette photo ?')).toBeTruthy();
    expect(screen.getByText('Elle sera retirée de l’annonce.')).toBeTruthy();

    fireEvent.press(screen.getByText('Supprimer'));
    act(() => { jest.runAllTimers(); });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Supprimer cette photo ?')).toBeNull();
  });

  it('propose « OK » par défaut pour un simple message', () => {
    render(<OverlayHost />);
    act(() => { appAlert('Annonce modifiée'); });
    expect(screen.getByText('OK')).toBeTruthy();
    fireEvent.press(screen.getByText('OK'));
    act(() => { jest.runAllTimers(); });
    expect(screen.queryByText('Annonce modifiée')).toBeNull();
  });
});

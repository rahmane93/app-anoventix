import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { appAlert } from './app-alert';
import { OverlayHost } from './overlay-host';

jest.useFakeTimers();

// @testing-library/react-native 14 : `render`, `act` et `fireEvent` sont asynchrones.
describe('appAlert', () => {
  it('affiche titre, message et boutons, puis exécute l’action choisie', async () => {
    const onDelete = jest.fn();
    await render(<OverlayHost />);

    await act(async () => {
      appAlert('Supprimer cette photo ?', 'Elle sera retirée de l’annonce.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]);
    });

    expect(screen.getByText('Supprimer cette photo ?')).toBeTruthy();
    expect(screen.getByText('Elle sera retirée de l’annonce.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Supprimer'));
    await act(async () => { jest.runAllTimers(); });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Supprimer cette photo ?')).toBeNull();
  });

  it('propose « OK » par défaut pour un simple message', async () => {
    await render(<OverlayHost />);
    await act(async () => { appAlert('Annonce modifiée'); });
    expect(screen.getByText('OK')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK'));
    await act(async () => { jest.runAllTimers(); });
    expect(screen.queryByText('Annonce modifiée')).toBeNull();
  });
});

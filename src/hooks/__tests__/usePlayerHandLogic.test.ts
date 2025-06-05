// /home/heagueron/jmu/dominando/src/hooks/__tests__/usePlayerHandLogic.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePlayerHandLogic, UsePlayerHandLogicProps} from '../usePlayerHandLogic';

describe('usePlayerHandLogic', () => {
  let defaultProps: UsePlayerHandLogicProps;

  beforeEach(() => {
    defaultProps = {
      idJugadorMano: 'player-1',
      isMyTurn: true,
      isRoundActive: true,
      isMyTurnTimerJustExpired: false,
      isAutoPasoForMe: false,
      currentPlayableFichaIds: ['ficha-1', 'ficha-2'],
    };
  });

  test('should initialize with no ficha selected', () => {
    const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
    expect(result.current.selectedFichaInfo).toBeUndefined();
  });

  describe('selectFicha', () => {
    test('should select a playable ficha if all conditions are met', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo).toEqual({
        idFicha: 'ficha-1',
        idJugadorMano: 'player-1',
      });
    });

    test('should deselect a ficha if it is selected again', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo).toBeDefined(); // Pre-condition

      act(() => {
        result.current.selectFicha('ficha-1'); // Select same ficha again
      });
      expect(result.current.selectedFichaInfo).toBeUndefined();
    });

    test('should switch selection to a new playable ficha', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo?.idFicha).toBe('ficha-1');

      act(() => {
        result.current.selectFicha('ficha-2');
      });
      expect(result.current.selectedFichaInfo).toEqual({
        idFicha: 'ficha-2',
        idJugadorMano: 'player-1',
      });
    });

    // Test cases for conditions preventing selection
    const nonSelectionTestCases: Array<[string, Partial<UsePlayerHandLogicProps>]> = [
      ['isRoundActive is false', { isRoundActive: false }],
      ['idJugadorMano is null', { idJugadorMano: null }],
      ['isMyTurn is false', { isMyTurn: false }],
      ['isAutoPasoForMe is true', { isAutoPasoForMe: true }],
      ['isMyTurnTimerJustExpired is true', { isMyTurnTimerJustExpired: true }],
      ['fichaId is not in currentPlayableFichaIds', { currentPlayableFichaIds: ['ficha-non-playable'] }],
    ];

    nonSelectionTestCases.forEach(([conditionName, propOverride]) => {
      test(`should not select a ficha if ${conditionName}`, () => {
        const props = { ...defaultProps, ...propOverride };
        const { result } = renderHook(() => usePlayerHandLogic(props));

        // Attempt to select a ficha that would otherwise be selectable
        const fichaToAttempt = defaultProps.currentPlayableFichaIds[0];

        act(() => {
          result.current.selectFicha(fichaToAttempt);
        });
        expect(result.current.selectedFichaInfo).toBeUndefined();
      });
    });

    test('should not select a ficha if trying to select a non-playable one, even if other conditions are met', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      act(() => {
        result.current.selectFicha('ficha-non-existent');
      });
      expect(result.current.selectedFichaInfo).toBeUndefined();
    });

    test('should not change selection if attempting to select a non-playable ficha when one is already selected', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      // First, select a valid ficha
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      const initialSelection = result.current.selectedFichaInfo;
      expect(initialSelection).toBeDefined();

      // Then, attempt to select a non-playable one
      act(() => {
        result.current.selectFicha('ficha-non-existent');
      });
      // Selection should remain unchanged
      expect(result.current.selectedFichaInfo).toEqual(initialSelection);
    });
  });

  describe('clearSelection', () => {
    test('should clear the selection if a ficha was selected', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo).toBeDefined(); // Pre-condition

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedFichaInfo).toBeUndefined();
    });

    test('should do nothing if no ficha was selected', () => {
      const { result } = renderHook(() => usePlayerHandLogic(defaultProps));
      expect(result.current.selectedFichaInfo).toBeUndefined(); // Pre-condition

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedFichaInfo).toBeUndefined();
    });
  });

  describe('Prop changes and selection stability', () => {
    test('selectedFichaInfo should remain selected if props change to make selection invalid AFTER selection', () => {
      const { result, rerender } = renderHook(
        (props: UsePlayerHandLogicProps) => usePlayerHandLogic(props),
        { initialProps: defaultProps }
      );

      // Select a ficha under valid conditions
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo?.idFicha).toBe('ficha-1');

      // Change props so that selection would now be invalid (e.g., not my turn)
      act(() => {
        rerender({ ...defaultProps, isMyTurn: false });
      });

      // The selected ficha should still be selected because selectFicha was not called again
      expect(result.current.selectedFichaInfo?.idFicha).toBe('ficha-1');

      // However, a new attempt to select (even the same ficha) should fail
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      // And because it's the same ficha, it should deselect it (as per current logic)
      // If the logic was "don't change selection if conditions are bad", this would be different.
      // The current logic is: if conditions are bad, `selectFicha` returns early.
      // If conditions are good, it proceeds to toggle or set.
      // Let's re-evaluate this specific interaction.
      // The `selectFicha` callback is recreated when its dependencies change.
      // If `isMyTurn` becomes false, the new `selectFicha` will have that in its closure.
      // If we call `result.current.selectFicha('ficha-1')` again:
      // 1. `isMyTurn` is false, so the `if` condition `!isMyTurn` is true.
      // 2. The function returns early. `setSelectedFichaInfo` is NOT called.
      // So, the selection should persist.
      expect(result.current.selectedFichaInfo?.idFicha).toBe('ficha-1');

      // If we try to select a *different* ficha, it should also fail to change.
      act(() => {
        result.current.selectFicha('ficha-2');
      });
      expect(result.current.selectedFichaInfo?.idFicha).toBe('ficha-1');
    });

    test('if idJugadorMano changes, selecting the same fichaId should update idJugadorMano in selection', () => {
      const { result, rerender } = renderHook(
        (props: UsePlayerHandLogicProps) => usePlayerHandLogic(props),
        { initialProps: defaultProps }
      );

      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo).toEqual({
        idFicha: 'ficha-1',
        idJugadorMano: 'player-1',
      });

      // Rerender with a new idJugadorMano
      act(() => {
        rerender({ ...defaultProps, idJugadorMano: 'player-2' });
      });

      // Select the same fichaId again. Now it should be for player-2
      act(() => {
        result.current.selectFicha('ficha-1');
      });
      expect(result.current.selectedFichaInfo).toEqual({
        idFicha: 'ficha-1',
        idJugadorMano: 'player-2',
      });
    });
  });
});
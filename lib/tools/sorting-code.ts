import type { Implementations } from "./languages";
import type { SortAlgorithm } from "./sorting";

/**
 * Working implementations, not sketches — each one sorts in place (or returns
 * a sorted array where that is the idiom) and can be pasted straight into a
 * file. They deliberately mirror the pseudocode line for line, so switching
 * tabs shows the same algorithm rather than a different one.
 */
export const SORT_CODE: Record<SortAlgorithm, Implementations> = {
  bubble: {
    csharp: `public static void BubbleSort(int[] a)
{
    for (int end = a.Length - 1; end > 0; end--)
    {
        bool swapped = false;

        for (int i = 0; i < end; i++)
        {
            if (a[i] > a[i + 1])
            {
                (a[i], a[i + 1]) = (a[i + 1], a[i]);
                swapped = true;
            }
        }

        if (!swapped) return;   // a clean pass means it is sorted
    }
}`,
    typescript: `function bubbleSort(a: number[]): number[] {
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;

    for (let i = 0; i < end; i++) {
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
      }
    }

    if (!swapped) return a;   // a clean pass means it is sorted
  }
  return a;
}`,
    python: `def bubble_sort(a: list[int]) -> list[int]:
    for end in range(len(a) - 1, 0, -1):
        swapped = False

        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                swapped = True

        if not swapped:       # a clean pass means it is sorted
            return a
    return a`,
    java: `static void bubbleSort(int[] a) {
    for (int end = a.length - 1; end > 0; end--) {
        boolean swapped = false;

        for (int i = 0; i < end; i++) {
            if (a[i] > a[i + 1]) {
                int tmp = a[i];
                a[i] = a[i + 1];
                a[i + 1] = tmp;
                swapped = true;
            }
        }

        if (!swapped) return;   // a clean pass means it is sorted
    }
}`,
  },

  insertion: {
    csharp: `public static void InsertionSort(int[] a)
{
    for (int i = 1; i < a.Length; i++)
    {
        int value = a[i];
        int j = i - 1;

        while (j >= 0 && a[j] > value)
        {
            a[j + 1] = a[j];   // shift right to make room
            j--;
        }

        a[j + 1] = value;
    }
}`,
    typescript: `function insertionSort(a: number[]): number[] {
  for (let i = 1; i < a.length; i++) {
    const value = a[i];
    let j = i - 1;

    while (j >= 0 && a[j] > value) {
      a[j + 1] = a[j];   // shift right to make room
      j--;
    }

    a[j + 1] = value;
  }
  return a;
}`,
    python: `def insertion_sort(a: list[int]) -> list[int]:
    for i in range(1, len(a)):
        value = a[i]
        j = i - 1

        while j >= 0 and a[j] > value:
            a[j + 1] = a[j]   # shift right to make room
            j -= 1

        a[j + 1] = value
    return a`,
    java: `static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int value = a[i];
        int j = i - 1;

        while (j >= 0 && a[j] > value) {
            a[j + 1] = a[j];   // shift right to make room
            j--;
        }

        a[j + 1] = value;
    }
}`,
  },

  selection: {
    csharp: `public static void SelectionSort(int[] a)
{
    for (int i = 0; i < a.Length - 1; i++)
    {
        int min = i;

        for (int j = i + 1; j < a.Length; j++)
            if (a[j] < a[min]) min = j;

        // At most one swap per pass, however large the array.
        if (min != i) (a[i], a[min]) = (a[min], a[i]);
    }
}`,
    typescript: `function selectionSort(a: number[]): number[] {
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;

    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[min]) min = j;
    }

    // At most one swap per pass, however large the array.
    if (min !== i) [a[i], a[min]] = [a[min], a[i]];
  }
  return a;
}`,
    python: `def selection_sort(a: list[int]) -> list[int]:
    for i in range(len(a) - 1):
        low = i

        for j in range(i + 1, len(a)):
            if a[j] < a[low]:
                low = j

        # At most one swap per pass, however large the list.
        if low != i:
            a[i], a[low] = a[low], a[i]
    return a`,
    java: `static void selectionSort(int[] a) {
    for (int i = 0; i < a.length - 1; i++) {
        int min = i;

        for (int j = i + 1; j < a.length; j++)
            if (a[j] < a[min]) min = j;

        // At most one swap per pass, however large the array.
        if (min != i) {
            int tmp = a[i];
            a[i] = a[min];
            a[min] = tmp;
        }
    }
}`,
  },

  merge: {
    csharp: `public static void MergeSort(int[] a, int lo, int hi)
{
    if (lo >= hi) return;                 // one element is already sorted

    int mid = lo + (hi - lo) / 2;
    MergeSort(a, lo, mid);
    MergeSort(a, mid + 1, hi);

    var left = a[lo..(mid + 1)];
    var right = a[(mid + 1)..(hi + 1)];

    int i = 0, j = 0, k = lo;
    while (i < left.Length && j < right.Length)
        a[k++] = left[i] <= right[j] ? left[i++] : right[j++];

    while (i < left.Length) a[k++] = left[i++];
    while (j < right.Length) a[k++] = right[j++];
}`,
    typescript: `function mergeSort(a: number[], lo = 0, hi = a.length - 1): number[] {
  if (lo >= hi) return a;                 // one element is already sorted

  const mid = Math.floor((lo + hi) / 2);
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);

  const left = a.slice(lo, mid + 1);
  const right = a.slice(mid + 1, hi + 1);

  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
  }

  while (i < left.length) a[k++] = left[i++];
  while (j < right.length) a[k++] = right[j++];
  return a;
}`,
    python: `def merge_sort(a: list[int], lo: int = 0, hi: int | None = None) -> list[int]:
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:                       # one element is already sorted
        return a

    mid = (lo + hi) // 2
    merge_sort(a, lo, mid)
    merge_sort(a, mid + 1, hi)

    left = a[lo:mid + 1]
    right = a[mid + 1:hi + 1]

    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            a[k] = left[i]; i += 1
        else:
            a[k] = right[j]; j += 1
        k += 1

    while i < len(left):
        a[k] = left[i]; i += 1; k += 1
    while j < len(right):
        a[k] = right[j]; j += 1; k += 1
    return a`,
    java: `static void mergeSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;                 // one element is already sorted

    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);

    int[] left = Arrays.copyOfRange(a, lo, mid + 1);
    int[] right = Arrays.copyOfRange(a, mid + 1, hi + 1);

    int i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length)
        a[k++] = left[i] <= right[j] ? left[i++] : right[j++];

    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
}`,
  },

  quick: {
    csharp: `public static void QuickSort(int[] a, int lo, int hi)
{
    if (lo >= hi) return;

    int pivot = a[hi];      // a real implementation randomises this
    int i = lo;

    for (int j = lo; j < hi; j++)
    {
        if (a[j] < pivot)
        {
            if (i != j) (a[i], a[j]) = (a[j], a[i]);
            i++;
        }
    }

    (a[i], a[hi]) = (a[hi], a[i]);   // the pivot is now final
    QuickSort(a, lo, i - 1);
    QuickSort(a, i + 1, hi);
}`,
    typescript: `function quickSort(a: number[], lo = 0, hi = a.length - 1): number[] {
  if (lo >= hi) return a;

  const pivot = a[hi];      // a real implementation randomises this
  let i = lo;

  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) {
      if (i !== j) [a[i], a[j]] = [a[j], a[i]];
      i++;
    }
  }

  [a[i], a[hi]] = [a[hi], a[i]];   // the pivot is now final
  quickSort(a, lo, i - 1);
  quickSort(a, i + 1, hi);
  return a;
}`,
    python: `def quick_sort(a: list[int], lo: int = 0, hi: int | None = None) -> list[int]:
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a

    pivot = a[hi]          # a real implementation randomises this
    i = lo

    for j in range(lo, hi):
        if a[j] < pivot:
            if i != j:
                a[i], a[j] = a[j], a[i]
            i += 1

    a[i], a[hi] = a[hi], a[i]      # the pivot is now final
    quick_sort(a, lo, i - 1)
    quick_sort(a, i + 1, hi)
    return a`,
    java: `static void quickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;

    int pivot = a[hi];      // a real implementation randomises this
    int i = lo;

    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            if (i != j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
            i++;
        }
    }

    int t2 = a[i]; a[i] = a[hi]; a[hi] = t2;   // the pivot is now final
    quickSort(a, lo, i - 1);
    quickSort(a, i + 1, hi);
}`,
  },
};

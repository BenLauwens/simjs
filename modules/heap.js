export { Heap };

class Heap {
    heap = [];
    cmp;

    constructor(cmp) {
        this.cmp = cmp;
    }

    isempty() {
        return this.heap.length === 0;
    }

    swap(index1, index2) {
        [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
    }

    push(value) {
        this.heap.push(value);
        this.heapifyUp();
    }

    heapifyUp() {
        let currentIndex = this.heap.length - 1;
        let parentIndex = Math.floor((currentIndex - 1) / 2);
        while (parentIndex >= 0 &&
               this.cmp(this.heap[currentIndex], this.heap[parentIndex])
        ) {
            this.swap(currentIndex, parentIndex);
            currentIndex = parentIndex;
            parentIndex = Math.floor((currentIndex - 1) / 2);
        }
    }

    pop() {
        const minValue = this.heap[0];
        if (this.heap.length === 1) {
            this.heap.pop()
        } else {
            this.heap[0] = this.heap.pop();
            this.heapifyDown();
        }
        return minValue;
    }

    heapifyDown() {
        let currentIndex = 0;
        let smallerChildIndex = 2 * currentIndex + 1;
        while (smallerChildIndex < this.heap.length) {
            if (smallerChildIndex + 1 < this.heap.length &&
                this.cmp(this.heap[smallerChildIndex + 1 ], this.heap[smallerChildIndex])
            ) {
                smallerChildIndex += 1;
            }
            if (this.cmp(this.heap[currentIndex], this.heap[smallerChildIndex])) {
                break;
            } else {
                this.swap(currentIndex, smallerChildIndex);
            }
            currentIndex = smallerChildIndex;
            smallerChildIndex = 2 * currentIndex + 1;
        }
    }
}
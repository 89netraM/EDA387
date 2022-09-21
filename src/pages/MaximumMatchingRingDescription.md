### Pseudo code of Self-stabilizing maximum matching on a a ring

There are n processors numbered 1 through n where 1 is the "king". Each
processor i has a register rᵢ that it can read an write to. Each processor
can also read from its predecessors register, pᵢ can read from rᵢ₋₁.
Each processor can point at one of its neighbors, or not point at all.

Every processor will execute one iteration of it's loop on each round. See the
"kings" and the regulars pseudo code below.

```python
king p₁:
do forever
	if rₙ == 1
		pointer₁ = n
	else
		pointer₁ = null
	fi
	r₁ = 0
od

regular pᵢ:
do forever
	if rᵢ₋₁ == 1
		rᵢ = 0
		pointerᵢ = i - 1
	else
		rᵢ = 1
		pointerᵢ = i + 1
	fi
od
```

The idea for the final state is for each processor pᵢ to point backwards if
it's odd and forward if it's even. The "king" will only point backwards if there
is an even number of processors.

A processor learns it's parity by reading the parity of it's predecessor from
its register and setting it's register to the inverse. The "king" knows it's
even and will always set it's register to 0.

Processor pᵢ will know its correct parity after i - 1 rounds, and thus all
processors will know their parity after n - 1 rounds. When all processors know
their parity they will all point correctly, and a maximum matching has been
reached.

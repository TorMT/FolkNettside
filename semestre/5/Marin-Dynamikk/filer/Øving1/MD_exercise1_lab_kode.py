import numpy as np
import matplotlib.pyplot as plt

x = np.array([1.075, 1.158, 1.279, 1.169, 1.322, 1.15])
m2 = np.array([0.366025, 0.648025, 1.010025, 1.452025, 1.974025, 2.576025])
kvdratm = np.array([0.3025, 0.4025, 0.5025, 0.6025, 0.7025, 0.8025])
deltPam = np.array([1.652892562, 1.242236025, 0.9950248756, 0.8298755187, 0.7117437722, 0.6230529595])


plt.plot(x, np.sqrt(x), 'o')
plt.show()
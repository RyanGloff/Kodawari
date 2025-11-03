import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  res.json([]);
});

router.get('/:id', async(req, res) => {
  res.json({});
});

router.post('/', async (req, res) => {

});

router.put('/' async (req, res) => {

});

router.delete('/', (_req, res) => {

});

export default router;

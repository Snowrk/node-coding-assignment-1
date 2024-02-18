const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'todoApplication.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

initializeDBAndServer()

const queryAugGen = (request, response, next) => {
  request.aug = request.query
  // console.log(request.aug)
  // console.log(request.query)
  next()
}

const bodyAugGen = (request, response, next) => {
  request.body.date = request.body.dueDate
  request.aug = request.body
  // console.log(request.aug)
  next()
}

const checker = (request, response, next) => {
  const {status, priority, category, date} = request.aug
  const priorityArr = ['HIGH', 'MEDIUM', 'LOW']
  const statusArr = ['TO DO', 'IN PROGRESS', 'DONE']
  const categoryArr = ['WORK', 'HOME', 'LEARNING']
  if (status !== undefined && !statusArr.includes(status)) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (priority !== undefined && !priorityArr.includes(priority)) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (category !== undefined && !categoryArr.includes(category)) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (date !== undefined && !isValid(new Date(date))) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    next()
  }
}

app.get('/todos/', queryAugGen, checker, async (request, response) => {
  try {
    const {
      status = '',
      priority = '',
      date = '',
      category = '',
      search_q = '',
    } = request.query
    const formatedDueDate =
      date !== '' ? format(new Date(date), 'yyyy-MM-dd') : ''
    const filteredTodosQuery = `SELECT id, todo, priority, status, category, due_date as dueDate FROM todo WHERE status LIKE '%${status}%' AND priority LIKE '%${priority}%' AND due_date LIKE '%${formatedDueDate}%' AND category LIKE '%${category}%' AND todo LIKE '%${search_q}%'`
    const filteredTodos = await db.all(filteredTodosQuery)
    response.send(filteredTodos)
  } catch (e) {
    console.log(e)
  }
})

app.get('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const todoQuery = `SELECT id, todo, priority, status, category, due_date as dueDate FROM todo WHERE id = ${todoId}`
    const todo = await db.get(todoQuery)
    response.send(todo)
  } catch (e) {
    console.log(e)
  }
})

app.get('/agenda/', queryAugGen, checker, async (request, response) => {
  try {
    const {date} = request.query
    const formatedDueDate = format(new Date(date), 'yyyy-MM-dd')
    const todosQuery = `SELECT id, todo, priority, status, category, due_date as dueDate FROM todo WHERE due_date = '${formatedDueDate}'`
    const todos = await db.all(todosQuery)
    response.send(todos)
  } catch (e) {
    console.log(e)
  }
})

app.post('/todos/', bodyAugGen, checker, async (request, response) => {
  try {
    const {id, todo, priority, status, category, dueDate} = request.body
    const formatedDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const uploadTodoQuery = `INSERT INTO todo(id, todo, priority, status, category, due_date) VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${formatedDueDate}')`
    const newTodo = await db.run(uploadTodoQuery)
    response.send('Todo Successfully Added')
  } catch (e) {
    console.log(e)
  }
})

app.put('/todos/:todoId/', bodyAugGen, checker, async (request, response) => {
  try {
    const {todoId} = request.params
    let updateTodoQuery
    let res
    switch (Object.getOwnPropertyNames(request.body)[0]) {
      case 'status':
        updateTodoQuery = `UPDATE todo SET status = '${request.body.status}' WHERE id = ${todoId}`
        res = 'Status Updated'
        break
      case 'priority':
        updateTodoQuery = `UPDATE todo SET priority = '${request.body.priority}' WHERE id = ${todoId}`
        res = 'Priority Updated'
        break
      case 'todo':
        updateTodoQuery = `UPDATE todo SET todo = '${request.body.todo}' WHERE id = ${todoId}`
        res = 'Todo Updated'
        break
      case 'category':
        updateTodoQuery = `UPDATE todo SET category = '${request.body.category}' WHERE id = ${todoId}`
        res = 'Category Updated'
        break
      case 'dueDate':
        const formatedDueDate = format(
          new Date(request.body.dueDate),
          'yyyy-MM-dd',
        )
        updateTodoQuery = `UPDATE todo SET due_date = '${formatedDueDate}' WHERE id = ${todoId}`
        res = 'Due Date Updated'
        break
      default:
        console.log('error in property name')
        break
    }
    const updatedTodo = await db.run(updateTodoQuery)
    // const logUpdatedTodo = await db.get(
    //   `SELECT * FROM todo WHERE id = ${todoId}`,
    // )
    // console.log(logUpdatedTodo)
    response.send(res)
  } catch (e) {
    console.log(e)
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId}`
    await db.run(deleteTodoQuery)
    response.send('Todo Deleted')
  } catch (e) {
    console.log(e)
  }
})

module.exports = app
